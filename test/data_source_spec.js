import chai from 'chai';
let assert = chai.assert;

import Geo from '../src/utils/geo';
import sampleTile from './fixtures/sample-tile.json';
import sampleGeoJSONResponse from './fixtures/sample-json-response.json';

import DataSource from '../src/sources/data_source';
import {
    GeoJSONTileSource,
    GeoJSONSource
} from '../src/sources/geojson';
import {MVTSource} from '../src/sources/mvt';

import Utils from '../src/utils/utils';

function getMockTile() {
    return Object.assign({}, sampleTile);
}

function getMockJSONResponse() {
    return JSON.stringify(Object.assign({}, sampleGeoJSONResponse));
}

describe('DataSource', () => {

    let url      = 'http://localhost:8080/{z}/{y}/{x}';
    let max_zoom = 12;
    let name     = 'test-source';
    let options  = {url, max_zoom, name};

    describe('.constructor(options)', () => {
        let subject;
        beforeEach(() => {
            subject = new DataSource(options);
        });

        it('returns a new instance', () => {
            assert.instanceOf(subject, DataSource);
        });
        it('sets the max_zoom level', () => {
            assert.equal(subject.max_zoom, max_zoom);
        });
    });

    describe('DataSource.create(options)', () => {

        describe('when I ask for a GeoJSON source with a tile template URL', () => {
            let subject = DataSource.create(Object.assign({}, {type: 'GeoJSON'}, options));
            it('returns a new GeoJSONTileSource', () => {
                assert.instanceOf(subject, GeoJSONTileSource);
            });
        });

        describe('when I ask for a GeoJSON source without a tile template URL', () => {
            let subject = DataSource.create(Object.assign({}, {type: 'GeoJSON'}, options, {url: 'http://localhost:8080/'}));
            it('returns a new GeoJSONSource', () => {
                assert.instanceOf(subject, GeoJSONSource);
            });
        });

        describe('when I ask for a MVTSource', () => {
            let subject = DataSource.create(Object.assign({}, {type: 'MVT'}, options));
            it('returns a new MVTSource', () => {
                assert.instanceOf(subject, MVTSource);
            });
        });
    });

    describe('DataSource.projectData(tile)', () => {
        let subject;
        beforeEach(() => {
            sinon.spy(Geo, 'transformGeometry');
            sinon.spy(Geo, 'latLngToMeters');
            subject = DataSource.projectData(sampleTile);
        });

        afterEach(() => {
            subject = undefined;
            Geo.transformGeometry.restore();
            Geo.latLngToMeters.restore();
        });

        it('calls the .transformGeometry() method', () => {
            sinon.assert.callCount(Geo.transformGeometry, 3);
        });

        it('calls the .latLngToMeters() method', () => {
            sinon.assert.callCount(Geo.latLngToMeters, 3);
        });

    });

    describe('DataSource.scaleData(tile)', () => {

        beforeEach(() => {
            sinon.spy(Geo, 'transformGeometry');
        });

        afterEach(() => {
            Geo.transformGeometry.restore();
        });

        it('calls the .transformGeometry() method', () => {

            DataSource.scaleData(sampleTile, sampleTile);
            assert.strictEqual(Geo.transformGeometry.callCount, 3);
        });

    });

    describe('NetworkSource', () => {

        describe('when creating an instance of a subclass of NetworkSource', () => {
            let subject = DataSource.create(Object.assign({}, {type: 'GeoJSON'}, options));
            it('sets the url', () => {
                assert.equal(subject.url, url);
            });
        });

    });

    describe('GeoJSONTileSource', () => {

        describe('.load(tile)', () => {

            describe('when there are no http errors', () => {
                let subject, mockTile;

                beforeEach(() => {
                    mockTile = getMockTile();
                    sinon.stub(Utils, 'io').returns(Promise.resolve({
                        status: 200,
                        body: getMockJSONResponse()
                    }));
                    subject = new GeoJSONTileSource(options);
                    return subject.load(mockTile);
                });

                afterEach(() => {
                    Utils.io.restore();
                    subject = undefined;
                });

                it('calls back with the tile object', async () => {
                    assert(!mockTile.source_data.error);
                    assert(await subject.load(mockTile));
                });
            });

            describe('when there are http errors', () => {
                let subject, mockTile;
                beforeEach(() => {
                    mockTile = getMockTile();
                    sinon.stub(Utils, 'io').returns(Promise.reject(new Error('I am an error')));
                    subject = new GeoJSONTileSource(options);
                    return subject.load(mockTile);
                });

                afterEach(() => {
                    Utils.io.restore();
                    subject = undefined;
                });

                it('resolves the promise but includes an error', () => {
                    assert(mockTile.source_data.error);
                });
            });
        });
    });

    describe('MVTSource', () => {
        let subject;

        beforeEach(() => {
            subject = new MVTSource(options);
        });

        describe('.constructor()', () => {
            it('returns a new instance', () => {
                assert.instanceOf(subject, MVTSource);
            });
        });

    });
});
