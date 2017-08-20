/* @flow */

import t from 'assert'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon';
import nock from 'nock'

import { Poloniex, PUBLIC_API, TRADING_API} from '../src/poloniex';
import { URL } from 'url';
import crypto from 'crypto';

process.on('unhandledRejection', (err) => {
  // no unhandled promise left unturned
  console.error(err)
  process.exit(1)
})

const sandbox = sinon.createSandbox();

const URL_PUBLIC_API = new URL(PUBLIC_API)
const URL_TRADING_API = new URL(TRADING_API)

describe('Poloniex', () => {
  it('should specify the maximum requests allowed for trading api')
  describe('#_get', () => {
    let plx, scope;
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex()
      scope = nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname)
    })
    afterEach(() => {
      nock.cleanAll()
      sandbox.reset()
    })
    it('should fail when more than 6 requests per second are made', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      for (let i=0; i<7; i++) {
        try {
          scope.reply(200, {})
          await plx._get()
          clock.tick(10); // add 10ms to time
        } catch(err) {
          t.equal(err, 'Error: restricting requests to Poloniex to maximum of 6 per second')
          t.equal(i, 6, 'the sixth request would fail');
        }
      }
    })
    it('should allow to request less than 6 requests per second', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      for (let i=0; i<8; i++) {
        scope.reply(200, {})
        await plx._get()
        clock.tick(500); // add 0.5s to time
      }
    })
    it('should use the correct public api url', () => {
      t.equal(PUBLIC_API, 'https://poloniex.com/public');
    })
    it('should create a get request to return data', (done) => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      scope.query(query).reply(200, res)
      plx._get(query).then( (result) => {
        t.deepEqual(res, result);
        done()
      })
    })
    it('should include the correct user-agent', (done) => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      scope = nock(URL_PUBLIC_API.origin)
        .matchHeader('User-Agent', 'github.com/kesor/crypto-exchange-api v0.0.1')
        .replyContentLength()
        .get(URL_PUBLIC_API.pathname)
        .query(query)
        .reply(200, res)
      plx._get(query).then( (result) => {
        t.deepEqual(res, result);
        t.equal(scope.pendingMocks().length, 0)
        done()
      })
    })
    it('should return an error on bad http status codes', (done) => {
      scope.reply(404, 'Not found')
      plx._get().catch( (result) => {
        t.equal('Error: Failed to load page, status code: 404', result)
        done()
      })
    })
    it('should return an error on errors during connection', (done) => {
      scope.replyWithError('request error')
      plx._get().catch( (result) => {
        t.equal('Error: request error', result)
        done()
      })
    })
    it('should return an error on errors from poloniex', (done) => {
      scope.reply(200, { error: 'poloniex has problems' })
      plx._get().catch( (result) => {
        t.equal('Error: Poloniex failure: poloniex has problems', result)
        done()
      })
    })
  })
  describe('public api commands', () => {
    let plx, fakeGet, startDate, endDate;
    beforeEach(() => {
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
  describe('#_post', () => {
    let plx, scope, pathname
    let key = 'public key'
    let secret = 'very secret part that is private'
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex(key, secret)
      pathname = URL_TRADING_API.pathname
      scope = nock(URL_TRADING_API.origin)
    })
    afterEach(() => {
      nock.cleanAll()
      sandbox.reset()
    })
    it('should use the correct trade api url', () => {
      t.equal(TRADING_API, 'https://poloniex.com/tradingApi');
    })
    it('should create a post request to return data', (done) => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      scope.post(pathname, query).reply(200, res)
      plx._post(query).then( (result) => {
        t.deepEqual(res, result);
        done()
      })
    });
    it('should sign requests', (done) => {
      let res = { 'hello': 'world' }
      let query = { command: 'complexCommand' }
      let scope = nock(URL_TRADING_API.origin)
        .matchHeader('User-Agent', 'github.com/kesor/crypto-exchange-api v0.0.1')
        .matchHeader('Key', key)
        .matchHeader('Sign', crypto.createHmac('sha512', secret).update('command=complexCommand').digest('hex'))
        .post(URL_TRADING_API.pathname, query).reply(200, res)
      plx._post(query).then( (result) => {
        t.deepEqual(res, result);
        done()
      })
    })
    it('should limit requests to a configurable limit per second', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      for (let i=0; i<plx.maxTrades + 1; i++) {
        try {
          scope.post(pathname).reply(200, {})
          await plx._post()
          clock.tick(1); // add 1ms to time
        } catch(err) {
          t.equal(err, 'Error: restricting requests to Poloniex to maximum of N per second')
          t.equal(i, plx.maxTrades, 'the next request would fail');
        }
      }
    })
    /*
    it('should fail when more than 6 requests per second are made', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      let plx = new Poloniex()
      for (let i=0; i<7; i++) {
        try {
          nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).reply(200, {})
          await plx._get()
          clock.tick(10); // add 10ms to time
        } catch(err) {
          t.equal(err, 'Error: restricting requests to Poloniex to maximum of 6 per second')
          t.equal(i, 6, 'the sixth request would fail');
        }
      }
    })
    it('should allow to request less than 6 requests per second', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      let plx = new Poloniex()
      for (let i=0; i<8; i++) {
        nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).reply(200, {})
        await plx._get()
        clock.tick(500); // add 0.5s to time
      }
    })
    */
    it('should send a nonce on each request')
      // validate that the nonce never repeats itself ...
      // use timestamp for nonce - but still do increment it
    it('should increment the nonce on each subsequent request')
    it('should raise an error on poloniex errors')
    it('should raise an error on http connection errors')
    it('should raise an error on status codes other that 2xx')

  })
  describe('trading api commands', () => {
    let plx, scope, pathname
    let key = 'public key'
    let secret = 'very secret part that is private'
    beforeEach(() => {
      pathname = URL_TRADING_API.pathname
      nock.disableNetConnect()
      plx = new Poloniex(key, secret)
      scope = nock(URL_TRADING_API.origin)
    })
    afterEach(() => {
      nock.cleanAll()
      sandbox.reset()
    })
    it('should implement returnBalances')
    it('should implement returnCompleteBalances')
    it('should allow to ask for returnCompleteBalances on exchange account')
    it('should allow to ask for returnCompleteBalances on margin account')
    it('should allow to ask for returnCompleteBalances on lending account')
    it('should implement returnDepositAddresses')
    it('should implement generateNewAddress for a specified currency')
    it('should implement returnDepositsWithdrawals between start and end unix timestamps')
    it('should implement returnOpenOrders for all currencies')
    it('should implement returnOpenOrders for a provided currencyPair')
    it('should implement returnTradeHistory for a all currencies')
    it('should implement returnTradeHistory for a provided currencyPair')
    it('should implement returnOrderTrades for a provided orderNumber')
    it('should implement buy for currencyPair at the rate and amount specified')
    it('should implement sell for currencyPair at the rate and amount specified')
    it('should implement cancelOrder for a specified orderNumber')
    it('should implement moveOrder of a provided orderNumber to modified rate and optionally amount')
    it('should implement withdraw for a specified currency, amount and address')
    it('should implement withdraw optional paymentId for XMR')
    it('should implement returnFeeInfo')
    it('should implement returnAvailableAccountBalances')
    it('should implement returnAvailableAccountBalances for the exchange account')
    it('should implement returnAvailableAccountBalances for the margin account')
    it('should implement returnAvailableAccountBalances for the lending account')
    it('should implement returnTradableBalances')
    it('should implement transferBalance for the specified currency, amount, toAccount and fromAccount')
    it('should implement returnMarginAccountSummary')
    it('should implement marginBuy for a specified currencyPair, rate and amount')
    it('should implement marginBuy optional lendingRate parameter')
    it('should implement marginSell for a specified currencyPair, rate and amount')
    it('should implement marginSell optional lendingRate parameter')
    it('should implement getMarginPosition for all currency pairs')
    it('should implement getMarginPosition for the specified currencyPair')
    it('should implement closeMarginPosition for a specific currencyPair')
    it('should implement createLoanOffer for the currency, amount duration, lendingRate and autoRenew')
    it('should implement cancelLoanOffer for a specified orderNumber')
    it('should implement returnOpenLoadOffers')
    it('should implement returnActiveLoans')
    it('should implement returnLendingHistory within a time range specified by start and end')
    it('should implement returnLendingHistory optional limit parameter')
    it('should implement toggleAutoRenew for a specified orderNumber')
  })
})