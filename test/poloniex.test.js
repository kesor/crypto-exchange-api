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
      sandbox.useFakeTimers(new Date())
      for (let i=1; i<8; i++) {
        try {
          if (i<7)
            scope.reply(200, {})
          await plx._get()
          sandbox.clock.tick(10); // add 10ms to time
          t.ok(i<7, 'the 7th request must fail')
        } catch(err) {
          t.equal(err, 'Error: restricting requests to Poloniex to maximum of 6 per second')
          t.equal(i, 7, 'the 7th request failed')
        }
      }
    })
    it('should allow to request less than 6 requests per second', async () => {
      sandbox.useFakeTimers(new Date())
      for (let i=1; i<10; i++) {
        scope.reply(200, {})
        await plx._get()
        sandbox.clock.tick(500); // add 0.5s to time
      }
    })
    it('should use the correct public api url', () => {
      t.equal(PUBLIC_API, 'https://poloniex.com/public');
    })
    it('should create a get request to return data', async () => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      scope.query(query).reply(200, res)
      t.deepEqual(res, await plx._get(query))
    })
    it('should include the correct user-agent', async () => {
      nock(URL_PUBLIC_API.origin)
        .matchHeader('User-Agent', 'github.com/kesor/crypto-exchange-api v0.0.1')
        .get(URL_PUBLIC_API.pathname)
        .reply(200, {})
      t.deepEqual({}, await plx._get())
    })
    it('should return an error on bad http status codes', (done) => {
      scope.reply(404, '{ "error": "Not found" }')
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
    it('should implement returnTicker', async () => {
      let res = {
        "BTC_LTC":{"last":"0.0251","lowestAsk":"0.02589999","highestBid":"0.0251","percentChange":"0.02390438","baseVolume":"6.16485315","quoteVolume":"245.82513926"},
        "BTC_NXT":{"last":"0.00005730","lowestAsk":"0.00005710","highestBid":"0.00004903","percentChange":"0.16701570","baseVolume":"0.45347489","quoteVolume":"9094"}
      }
      fakeGet.returns(res);
      t.deepEqual(res, await plx.returnTicker())
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnTicker' }))
    })
    it('should implement return24hVolume', async () => {
      let res = {"BTC_LTC":{"BTC":"2.23248854","LTC":"87.10381314"},"BTC_NXT":{"BTC":"0.981616","NXT":"14145"}, "totalBTC":"81.89657704","totalLTC":"78.52083806"};
      fakeGet.returns(res)
      t.deepEqual(res, await plx.return24hVolume())
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'return24hVolume' }))
    })
    it('should implement returnOrderBook without arguments', async () => {
      let res = {
        "BTC_NXT": { "asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 18849},
        "BTC_XMR": { "asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 5230},
      };
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook())
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'all', depth: 10 }))
    })
    it('should implement returnOrderBook for a selected currency pair', async () => {
      let res = {"asks":[[0.00007600,1164],[0.00007620,1300]], "bids":[[0.00006901,200],[0.00006900,408]], "isFrozen": 0, "seq": 18849};
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook('BTC_ETH'))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 10 }))
    })
    it('should implement returnOrderBook with a selected depth', async () => {
      let res = {"asks":[[0.00007600,1164]],"bids":[[0.00006901,200]],"isFrozen":0,"seq":18849};
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook('BTC_ETH', 20))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 20 }))
    })
    it('should implement returnTradeHistory for a selected currency pair', async () => {
      let res = [{"date":"2014-02-10 04:23:23","type":"buy","rate":"0.00007600","amount":"140","total":"0.01064"},{"date":"2014-02-10 01:19:37","type":"buy","rate":"0.00007600","amount":"655","total":"0.04978"} ]
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory('BTC_NXT'))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnTradeHistory', currencyPair: 'BTC_NXT' }))
    })
    it('should implement returnTradeHistory with a selected start and/or end dates', async () => {
      let res = [{"date":"2014-02-10 04:23:23","type":"buy","rate":"0.00007600","amount":"140","total":"0.01064"},{"date":"2014-02-10 01:19:37","type":"buy","rate":"0.00007600","amount":"655","total":"0.04978"} ]
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory('BTC_NXT', startDate, endDate))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({
        command: 'returnTradeHistory', currencyPair: 'BTC_NXT',
        start: Math.floor(startDate/1000), end: Math.floor(endDate/1000)
      }))
    })
    it('should implement returnChartData with currencyPair, period start and end', async () => {
      let res = [{"date":1405699200,"high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,"volume":44.11655644,
      "quoteVolume":10259.29079097,"weightedAverage":0.00430015}];
      let period = 14400;
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnChartData('BTC_NXT', period, startDate, endDate))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({
        command: 'returnChartData', currencyPair: 'BTC_NXT', period: period,
        start: Math.floor(startDate/1000), end: Math.floor(endDate/1000)
      }))
    })
    it('should implement returnChartData that rejects non-valid period parameter', (done) => {
      plx.returnChartData('BTC_NXT', 666, startDate, endDate).catch( (data) => {
        t.ok(fakeGet.notCalled)
        t.equal(data, 'Error: period must be one of 300, 900, 1800, 7200, 14400 or 86400')
        done()
      })
    })
    it('should implement returnCurrencies', async () => {
      let res = {"1CR":{"maxDailyWithdrawal":10000,"txFee":0.01,"minConf":3,"disabled":0},"ABY":{"maxDailyWithdrawal":10000000,"txFee":0.01,"minConf":8,"disabled":0} }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnCurrencies())
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnCurrencies' }))
    })
    it('should implement returnLoadOrders for a given currency', async () => {
      let res = {"offers":[{"rate":"0.00200000","amount":"64.66305732","rangeMin":2,"rangeMax":8} ],"demands":[{"rate":"0.00170000","amount":"26.54848841","rangeMin":2,"rangeMax":2} ]}
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnLoadOrders('BTC'))
      t.ok(fakeGet.calledOnce)
      t.ok(fakeGet.calledWith({ command: 'returnLoadOrders', currency: 'BTC' }))
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
    it('should create a post request to return data', async () => {
      let res = { 'hello': 'world' }
      let query = { command: 'somethingComplex' }
      scope.post(pathname, query).reply(200, res)
      t.deepEqual(res, await plx._post(query))
    });
    it('should sign requests', async () => {
      let query = { command: 'complexCommand' }
      let scope = nock(URL_TRADING_API.origin)
        .matchHeader('Key', key)
        .matchHeader('Sign', crypto.createHmac('sha512', secret).update('command=complexCommand').digest('hex'))
        .post(URL_TRADING_API.pathname, query)
        .reply(200, {})
      t.deepEqual({}, await plx._post(query))
    })
    it('should limit requests to a configurable limit per second', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      for (let i=1; i < plx.maxTrades + 2; i++) {
        try {
          if (i<plx.maxTrades + 1)
            scope.post(pathname).reply(200, {})
          await plx._post()
          clock.tick(10); // add 1ms to time
          t.ok(i<plx.maxTrades + 1, 'the amount of requests is limited')
        } catch (err) {
          t.equal(err, `Error: restricting requests to Poloniex to maximum of ${plx.maxTrades} per second`)
          t.equal(i, plx.maxTrades + 1, 'the last request failed')
        }
      }
    })
    it('should allow to request less than the configurable amount of requests per second', async () => {
      let clock = sandbox.useFakeTimers(new Date())
      for (let i = 1; i < plx.maxTrades + 4; i++) {
        scope.post(pathname).reply(200, {})
        await plx._post()
        clock.tick(1000 / (plx.maxTrades - 1))
      }
    })
    it('should send a nonce on each request', async () => {
      sandbox.useFakeTimers(new Date())
      scope.matchHeader('nonce', (sandbox.clock.now * 100).toString())
        .post(pathname)
        .reply(200, {})
      t.deepEqual({}, await plx._post())
    })
    it('should never repeat the same nonce twice', async () => {
      sandbox.useFakeTimers(new Date())
      scope.post(pathname).matchHeader('nonce', (sandbox.clock.now * 100).toString()).reply(200, {})
      scope.post(pathname).matchHeader('nonce', (sandbox.clock.now * 100 + 1).toString()).reply(200, {})
      await plx._post()
      await plx._post()
    })
    it('should raise an error on poloniex errors', (done) => {
      scope.post(pathname).reply(200, { error: 'poloniex has problems' })
      plx._post().catch( (result) => {
        t.equal('Error: Poloniex failure: poloniex has problems', result)
        done()
      })
    })
    it('should raise an error on http connection errors', (done) => {
      scope.post(pathname).replyWithError('request error')
      plx._post().catch( (result) => {
        t.equal('Error: request error', result)
        done()
      })
    })
    it('should raise an error on status codes other that 2xx', (done) => {
      scope.post(pathname).reply(404, '{ "error": "Not found" }')
      plx._post().catch( (result) => {
        t.equal('Error: Failed to load page, status code: 404', result)
        done()
      })
    })
  })
  describe('trading api commands', () => {
    let plx, fakePost, startDate, endDate;
    let key = 'public key'
    let secret = 'very secret part that is private'
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex(key, secret)
      fakePost = sandbox.stub(plx, '_post')
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1)
      endDate = new Date();
    })
    afterEach(() => {
      sandbox.reset();
    })
    it('should implement returnBalances', async () => {
      let res = {"BTC":"0.59098578","LTC":"3.31117268"}
      fakePost.returns(res);
      t.deepEqual(res, await plx.returnBalances())
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: 'returnBalances' }))
    })
    it('should implement returnCompleteBalances', async () => {
      let res = {
        "LTC":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"},
        "NXT":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"}
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnCompleteBalances())
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: 'returnCompleteBalances' }))
    })
    it('should allow to ask for returnCompleteBalances on exchange account', async () => {
      // TODO: check what the REAL response is
      let res = {
        "exchange": {
          "LTC":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"},
          "NXT":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"}
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnCompleteBalances(true))
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: 'returnCompleteBalances', "account": "all" }))
    })
    it('should implement returnDepositAddresses', async () => {
      let res = {"BTC":"19YqztHmspv2egyD6jQM3yn81x5t5krVdJ","LTC":"LPgf9kjv9H1Vuh4XSaKhzBe8JHdou1WgUB","ITC":"Press Generate.."}
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnDepositAddresses())
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: "returnDepositAddresses" }))
    })
    it('should implement generateNewAddress for a specified currency', async () => {
      let res = {"success":1,"response":"CKXbbs8FAVbtEa397gJHSutmrdrBrhUMxe"}
      fakePost.returns(res)
      t.deepEqual(res, await plx.generateNewAddress('BTC'))
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: "generateNewAddress", "currency": "BTC" }))
    })
    it('should implement returnDepositsWithdrawals between start and end unix timestamps', async () => {
      let res = {"deposits": [{"currency":"BTC","address":"xxx","amount":"0.01006132","confirmations":10,
      "txid":"17f819a91369a9ff6c4a34216d434597cfc1b4a3d0489b46bd6f924137a47701","timestamp":1399305798,"status":"COMPLETE"},{"currency":"BTC","address":"yyy","amount":"0.00404104","confirmations":10,
      "txid":"7acb90965b252e55a894b535ef0b0b65f45821f2899e4a379d3e43799604695c","timestamp":1399245916,"status":"COMPLETE"}],
      "withdrawals":[{"withdrawalNumber":134933,"currency":"BTC","address":"1N2i5n8DwTGzUq2Vmn9TUL8J1vdr1XBDFg","amount":"5.00010000",
      "timestamp":1399267904,"status":"COMPLETE: 36e483efa6aff9fd53a235177579d98451c4eb237c210e66cd2b9a2d4a988f8e","ipAddress":"127.0.0.1"}]}
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnDepositsWithdrawals(startDate, endDate))
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ command: "returnDepositsWithdrawals", "start": Math.floor(startDate/1000), "end": Math.floor(endDate/1000) }))
    })
    it('should implement returnOpenOrders for a provided currencyPair', async () => {
      let res = [{"orderNumber":"120466","type":"sell","rate":"0.025","amount":"100","total":"2.5"},{"orderNumber":"120467","type":"sell","rate":"0.04","amount":"100","total":"4"}]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnOpenOrders("BTC_XCP"))
      t.ok(fakePost.calledOnce)
      t.ok(fakePost.calledWith({ "command": "returnOpenOrders", "currencyPair": "BTC_XCP" }))
    })
    // it('should implement returnTradeHistory for a all currencies', async () => {
    //   let res = [{ "globalTradeID": 25129732, "tradeID": "6325758", "date": "2016-04-05 08:08:40", "rate": "0.02565498", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225313575", "type": "sell", "category": "exchange" }, { "globalTradeID": 25129628, "tradeID": "6325741", "date": "2016-04-05 08:07:55", "rate": "0.02565499", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225195693", "type": "buy", "category": "exchange" }]
    //   fakePost.returns(res)
    //   t.deepEqual(res, await plx.returnTradeHistory("BTC_XCP"))
    //   t.ok(fakePost.calledOnce)
    //   t.ok(fakePost.calledWith({ "command": "returnTradeHistory", "currencyPair": "BTC_XCP" }))
    // })
    // it('should implement returnTradeHistory with a startDate parameter', async () => {
    //   let res = [{ "globalTradeID": 25129732, "tradeID": "6325758", "date": "2016-04-05 08:08:40", "rate": "0.02565498", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225313575", "type": "sell", "category": "exchange" }, { "globalTradeID": 25129628, "tradeID": "6325741", "date": "2016-04-05 08:07:55", "rate": "0.02565499", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225195693", "type": "buy", "category": "exchange" }]
    //   fakePost.returns(res)
    //   t.deepEqual(res, await plx.returnTradeHistory("BTC_XCP", startDate))
    //   t.ok(fakePost.calledOnce)
    //   t.ok(fakePost.calledWith({
    //     command: "returnTradeHistory", currencyPair: "BTC_XCP",
    //     start: Math.floor(startDate/1000)
    //   }))
    // })
    // it('should implement returnTradeHistory with a startDate and endDate parameters', async () => {
    //   let res = [{ "globalTradeID": 25129732, "tradeID": "6325758", "date": "2016-04-05 08:08:40", "rate": "0.02565498", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225313575", "type": "sell", "category": "exchange" }, { "globalTradeID": 25129628, "tradeID": "6325741", "date": "2016-04-05 08:07:55", "rate": "0.02565499", "amount": "0.10000000", "total": "0.00256549", "fee": "0.00200000", "orderNumber": "34225195693", "type": "buy", "category": "exchange" }]
    //   fakePost.returns(res)
    //   t.deepEqual(res, await plx.returnTradeHistory("BTC_XCP", startDate, endDate))
    //   t.ok(fakePost.calledOnce)
    //   t.ok(fakePost.calledWith({
    //     command: "returnTradeHistory", currencyPair: "BTC_XCP",
    //     start: Math.floor(startDate/1000), end: Math.floor(endDate/1000)
    //   }))
    // })
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