import Utils from '../utils/utils';
import * as URLs from '../utils/urls';

import yaml from 'js-yaml';

export class SceneBundle {

    constructor(url, path, parent = null) {
        this.url = url;

        // If a base path was provided, use it for resolving local bundle resources only if
        // the base path is absolute, or this bundle's path is relative
        if (path && (!URLs.isRelativeURL(path) || URLs.isRelativeURL(this.url))) {
            this.path = path;
        }
        else {
            this.path = URLs.pathForURL(this.url);
        }

        this.path_for_parent = path || this.path; // for resolving paths relative to a parent bundle
        this.parent = parent;

        // An ancestor bundle may be a container (e.g. zip file) that needs to resolve relative paths
        // for any scenes it contains, e.g. `root.zip` has a `root.yaml` that includes a `folder/child.yaml`:
        // resources within `child.yaml` must be resolved through the bundle for `root.zip`
        this.container = null;
        if (this.parent) {
            if (this.parent.container) {
                this.container = this.parent.container;
            }
            else if (this.parent.isContainer()) {
                this.container = this.parent;
            }
        }
    }

    load() {
        return loadResource(this.url);
    }

    // Info for retrieving a specific resource from this bundle
    // url: fully qualified URL to retrieve the content of the resource (e.g. zips will transform this to blob URL)
    // path: original path of the resource within the bundle (for resolving paths up the bundle tree)
    // type: file extension (used for determining bundle type, `yaml` or `zip`)
    resourceFor(url) {
        return {
            url: this.urlFor(url),
            path: this.pathFor(url),
            type: this.typeFor(url)
        };
    }

    urlFor(url) {
        if (isGlobal(url)) {
            return url;
        }

        if (URLs.isRelativeURL(url) && this.container) {
            return this.parent.urlFor(this.path_for_parent + url);
        }
        return URLs.addBaseURL(url, this.path);
    }

    pathFor(url) {
        return URLs.pathForURL(url);
    }

    typeFor(url) {
        return URLs.extensionForURL(url);
    }

    isContainer() {
        return false;
    }

}

export function createSceneBundle(url, path, parent) {
    return new SceneBundle(url, path, parent);
}

// References a global property?
export function isGlobal (val) {
    if (val && val.slice(0, 7) === 'global.') {
        return true;
    }
    return false;
}

function parseResource (body) {
    var data;
    try {
        // jsyaml 'json' option allows duplicate keys
        // Keeping this for backwards compatibility, but should consider migrating to requiring
        // unique keys, as this is YAML spec. But Tangram ES currently accepts dupe keys as well,
        // so should consider how best to unify.
        data = yaml.safeLoad(body, { json: true });
    } catch (e) {
        throw e;
    }
    return data;
}

function loadResource (source) {
    return new Promise((resolve, reject) => {
        if (typeof source === 'string') {
            Utils.io(source).then(({ body }) => {
                try {
                    resolve(parseResource(body));
                }
                catch(e) {
                    reject(e);
                }
            }, reject);
        } else {
            // shallow copy to avoid modifying provided object, allowing a single config object to be loaded multiple times
            // TODO: address possible modifications to nested properties (mostly harmless / due to data normalization)
            source = Object.assign({}, source);
            resolve(source);
        }
    });
}
