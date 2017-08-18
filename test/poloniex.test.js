/* @flow */
import t from 'assert'
import { describe, it, before, after, afterEach } from 'mocha'
import * as sinon from 'sinon';
import nock from 'nock'

import { Poloniex, PUBLIC_API} from '../src/poloniex';
import { URL } from 'url';

process.on('unhandledRejection', (err) => {
  // no unhandled promise left unturned
  console.error(err)
  process.exit(1)
})

const sandbox = sinon.createSandbox();

const URL_PUBLIC_API = new URL(PUBLIC_API)

describe('Poloniex', () => {
  describe('#_get', () => {
    before(() => { nock.disableNetConnect() })
    after(() => { nock.cleanAll() })
    it('should use the correct public api url', () => {
      t.equal(PUBLIC_API, 'https://poloniex.com/public');
    })
    it('should create a get request to return data', (done) => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).query(query).reply(200, res)
      new Poloniex()._get(query).then( (result) => {
        t.deepEqual(res, result);
        done()
      })
    })
    it('should return an error on bad http status codes', (done) => {
      nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).reply(404, 'Not found')
      new Poloniex()._get().catch( (result) => {
        t.equal('Error: Failed to load page, status code: 404', result)
        done()
      })
    })
    it('should return an error on errors during connection', (done) => {
      nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).replyWithError('request error')
      new Poloniex()._get().catch( (result) => {
        t.equal('Error: request error', result)
        done()
      })
    })
    it('should return an error on errors from poloniex', (done) => {
      nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).reply(200, { error: 'poloniex has problems' })
      new Poloniex()._get().catch( (result) => {
        t.equal('Error: Poloniex failure: poloniex has problems', result)
        done()
      })
    })
  })
  describe('commands', () => {
    let plx, fakeGet, startDate, endDate;
    before(() => {
      plx = new Poloniex()
      fakeGet = sandbox.stub(plx, '_get')
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1)
      endDate = new Date();
    })
    afterEach(() => {
      sandbox.reset();
    })
    it('should implement returnTicker', (done) => {
      let res = {
        "BTC_LTC":{"last":"0.0251","lowestAsk":"0.02589999","highestBid":"0.0251","percentChange":"0.02390438","baseVolume":"6.16485315","quoteVolume":"245.82513926"},
        "BTC_NXT":{"last":"0.00005730","lowestAsk":"0.00005710","highestBid":"0.00004903","percentChange":"0.16701570","baseVolume":"0.45347489","quoteVolume":"9094"}
      }
      fakeGet.returns(res);
      plx.returnTicker().then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnTicker' }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement return24hVolume', (done) => {
      let res = {"BTC_LTC":{"BTC":"2.23248854","LTC":"87.10381314"},"BTC_NXT":{"BTC":"0.981616","NXT":"14145"}, "totalBTC":"81.89657704","totalLTC":"78.52083806"};
      fakeGet.returns(res)
      plx.return24Volume().then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'return24hVolume' }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnOrderBook without arguments', (done) => {
      let res = {
        "BTC_NXT": { "asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 18849},
        "BTC_XMR": { "asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 5230},
      };
      fakeGet.returns(res)
      plx.returnOrderBook().then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'all', depth: 10 }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnOrderBook for a selected currency pair', (done) => {
      let res = {"asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 18849};
      fakeGet.returns(res)
      plx.returnOrderBook('BTC_ETH').then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 10 }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnOrderBook with a selected depth', (done) => {
      let res = {"asks":[[0.00007600,1164]],"bids":[[0.00006901,200]],"isFrozen":0,"seq":18849};
      fakeGet.returns(res)
      plx.returnOrderBook('BTC_ETH', 20).then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 20 }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnTradeHistory for a selected currency pair', (done) => {
      let res = [{"date":"2014-02-10 04:23:23","type":"buy","rate":"0.00007600","amount":"140","total":"0.01064"},{"date":"2014-02-10 01:19:37","type":"buy","rate":"0.00007600","amount":"655","total":"0.04978"} ]
      fakeGet.returns(res)
      plx.returnTradeHistory('BTC_NXT').then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnTradeHistory', currencyPair: 'BTC_NXT' }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnTradeHistory with a selected start and/or end dates', (done) => {
      let res = [{"date":"2014-02-10 04:23:23","type":"buy","rate":"0.00007600","amount":"140","total":"0.01064"},{"date":"2014-02-10 01:19:37","type":"buy","rate":"0.00007600","amount":"655","total":"0.04978"} ]
      fakeGet.returns(res)
      plx.returnTradeHistory('BTC_NXT', startDate, endDate).then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({
          command: 'returnTradeHistory', currencyPair: 'BTC_NXT',
          start: Math.floor(startDate/1000), end: Math.floor(endDate/1000)
        }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnChartData with currencyPair, period start and end', (done) => {
      let res = [{"date":1405699200,"high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,"volume":44.11655644,
      "quoteVolume":10259.29079097,"weightedAverage":0.00430015}];
      let period = 14400;
      fakeGet.returns(res)
      plx.returnChartData('BTC_NXT', period, startDate, endDate).then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({
          command: 'returnChartData', currencyPair: 'BTC_NXT', period: period,
          start: Math.floor(startDate/1000), end: Math.floor(endDate/1000)
        }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnChartData that rejects non-valid period parameter', (done) => {
      plx.returnChartData('BTC_NXT', 666, startDate, endDate).catch( (data) => {
        t.ok(fakeGet.notCalled)
        t.equal(data, 'Error: period must be one of 300, 900, 1800, 7200, 14400 or 86400')
        done()
      })
    })
    it('should implement returnCurrencies', (done) => {
      let res = {"1CR":{"maxDailyWithdrawal":10000,"txFee":0.01,"minConf":3,"disabled":0},"ABY":{"maxDailyWithdrawal":10000000,"txFee":0.01,"minConf":8,"disabled":0} }
      fakeGet.returns(res)
      plx.returnCurrencies().then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnCurrencies' }))
        t.deepEqual(data, res)
        done()
      })
    })
    it('should implement returnLoadOrders for a given currency', (done) => {
      let res = {"offers":[{"rate":"0.00200000","amount":"64.66305732","rangeMin":2,"rangeMax":8} ],"demands":[{"rate":"0.00170000","amount":"26.54848841","rangeMin":2,"rangeMax":2} ]}
      fakeGet.returns(res)
      plx.returnLoadOrders('BTC').then( (data) => {
        t.ok(fakeGet.calledOnce)
        t.ok(fakeGet.calledWith({ command: 'returnLoadOrders', currency: 'BTC' }))
        t.deepEqual(data, res)
        done()
      })
    })
  })
})