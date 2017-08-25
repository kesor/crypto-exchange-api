/* @flow */

import t from 'assert'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon'
import nock from 'nock'

import { Poloniex, PUBLIC_API, TRADING_API } from '../src/poloniex'
import { URL } from 'url'
import crypto from 'crypto'
import querystring from 'querystring'

process.on('unhandledRejection', (err) => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})

const sandbox = sinon.createSandbox()

const URL_PUBLIC_API = new URL(PUBLIC_API)
const URL_TRADING_API = new URL(TRADING_API)

describe('Poloniex', () => {
  describe('#_get', () => {
    let plx, scope, query
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex()
      query = { command: 'illegal' }
      scope = nock(URL_PUBLIC_API.origin).get(URL_PUBLIC_API.pathname).query(query)
    })
    afterEach(() => {
      nock.cleanAll()
      sandbox.reset()
    })
    it('should fail when more than 6 requests per second are made', async () => {
      sandbox.useFakeTimers(new Date())
      for (let i = 1; i < 8; i++) {
        try {
          if (i < 7) { scope.reply(200, {}) }
          await plx._get(query)
          sandbox.clock.tick(10) // add 10ms to time
          t.ok(i < 7, 'the 7th request must fail')
        } catch (err) {
          t.equal(err, 'Error: restricting requests to Poloniex to maximum of 6 per second')
          t.equal(i, 7, 'the 7th request failed')
        }
      }
    })
    it('should allow to request less than 6 requests per second', async () => {
      sandbox.useFakeTimers(new Date())
      for (let i = 1; i < 10; i++) {
        scope.reply(200, {})
        await plx._get(query)
        sandbox.clock.tick(500) // add 0.5s to time
      }
    })
    it('should use the correct public api url', () => {
      t.equal(PUBLIC_API, 'https://poloniex.com/public')
    })
    it('should create a get request to return data', async () => {
      let res = { hello: 'world' }
      scope.reply(200, res)
      t.deepEqual(res, await plx._get(query))
    })
    it('should include the correct user-agent', async () => {
      nock(URL_PUBLIC_API.origin)
        .matchHeader('User-Agent', 'github.com/kesor/crypto-exchange-api v0.0.1')
        .get(URL_PUBLIC_API.pathname)
        .query(query)
        .reply(200, {})
      t.deepEqual({}, await plx._get(query))
    })
    it('should return an error on bad http status codes', (done) => {
      scope.reply(404, '{ "error": "Not found" }')
      plx._get(query).catch((result) => {
        t.equal('Error: HTTP 404 Returned error: Not found', result)
        done()
      })
    })
    it('should return an error on errors during connection', (done) => {
      scope.replyWithError('request error')
      plx._get(query).catch((result) => {
        t.equal('Error: request error', result)
        done()
      })
    })
    it('should return an error on errors from poloniex', (done) => {
      scope.reply(200, { error: 'poloniex has problems' })
      plx._get(query).catch((result) => {
        t.equal('Error: HTTP 200 Returned error: poloniex has problems', result)
        done()
      })
    })
  })
  describe('public api commands - call .get() just once', () => {
    let plx, fakeGet, startDate, endDate
    beforeEach(() => {
      plx = new Poloniex()
      fakeGet = sandbox.stub(plx, '_get')
      startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
      endDate = new Date()
    })
    afterEach(() => {
      t.ok(fakeGet.calledOnce)
      sandbox.reset()
    })
    it('should implement returnTicker', async () => {
      let res = {
        'BTC_LTC': { 'last': '0.0251', 'lowestAsk': '0.02589999', 'highestBid': '0.0251', 'percentChange': '0.02390438', 'baseVolume': '6.16485315', 'quoteVolume': '245.82513926' },
        'BTC_NXT': { 'last': '0.00005730', 'lowestAsk': '0.00005710', 'highestBid': '0.00004903', 'percentChange': '0.16701570', 'baseVolume': '0.45347489', 'quoteVolume': '9094' }
      }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnTicker())
      t.ok(fakeGet.calledWith({ command: 'returnTicker' }))
    })
    it('should implement return24hVolume', async () => {
      let res = { 'BTC_LTC': { 'BTC': '2.23248854', 'LTC': '87.10381314' }, 'BTC_NXT': { 'BTC': '0.981616', 'NXT': '14145' }, 'totalBTC': '81.89657704', 'totalLTC': '78.52083806' }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.return24hVolume())
      t.ok(fakeGet.calledWith({ command: 'return24hVolume' }))
    })
    it('should implement returnOrderBook without arguments', async () => {
      let res = {
        'BTC_NXT': { 'asks': [[0.00007600, 1164], [0.00007620, 1300]], 'bids': [[0.00006901, 200], [0.00006900, 408]], 'isFrozen': 0, 'seq': 18849 },
        'BTC_XMR': { 'asks': [[0.00007600, 1164], [0.00007620, 1300]], 'bids': [[0.00006901, 200], [0.00006900, 408]], 'isFrozen': 0, 'seq': 5230 }
      }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook())
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'all', depth: 10 }))
    })
    it('should implement returnOrderBook for a selected currency pair', async () => {
      let res = { 'asks': [[0.00007600, 1164], [0.00007620, 1300]], 'bids': [[0.00006901, 200], [0.00006900, 408]], 'isFrozen': 0, 'seq': 18849 }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook('BTC_ETH'))
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 10 }))
    })
    it('should implement returnOrderBook with a selected depth', async () => {
      let res = { 'asks': [[0.00007600, 1164]], 'bids': [[0.00006901, 200]], 'isFrozen': 0, 'seq': 18849 }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnOrderBook('BTC_ETH', 20))
      t.ok(fakeGet.calledWith({ command: 'returnOrderBook', currencyPair: 'BTC_ETH', depth: 20 }))
    })
    it('should implement Public returnTradeHistory for a selected currency pair', async () => {
      let res = [{ 'date': '2014-02-10 04:23:23', 'type': 'buy', 'rate': '0.00007600', 'amount': '140', 'total': '0.01064' }, { 'date': '2014-02-10 01:19:37', 'type': 'buy', 'rate': '0.00007600', 'amount': '655', 'total': '0.04978' }]
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory(false, 'BTC_NXT'))
      t.ok(fakeGet.calledWith({ command: 'returnTradeHistory', currencyPair: 'BTC_NXT' }))
    })
    it('should implement Public returnTradeHistory with a selected start and/or end dates', async () => {
      let res = [{ 'date': '2014-02-10 04:23:23', 'type': 'buy', 'rate': '0.00007600', 'amount': '140', 'total': '0.01064' }, { 'date': '2014-02-10 01:19:37', 'type': 'buy', 'rate': '0.00007600', 'amount': '655', 'total': '0.04978' }]
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory(false, 'BTC_NXT', startDate, endDate))
      t.ok(fakeGet.calledWith({
        command: 'returnTradeHistory',
        currencyPair: 'BTC_NXT',
        start: Math.floor(startDate / 1000).toString(),
        end: Math.floor(endDate / 1000).toString()
      }))
    })
    it('should implement returnChartData with currencyPair, period start and end', async () => {
      let res = [{
        'date': 1405699200,
        'high': 0.0045388,
        'low': 0.00403001,
        'open': 0.00404545,
        'close': 0.00427592,
        'volume': 44.11655644,
        'quoteVolume': 10259.29079097,
        'weightedAverage': 0.00430015
      }]
      let period = 14400
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnChartData('BTC_NXT', period, startDate, endDate))
      t.ok(fakeGet.calledWith({
        command: 'returnChartData',
        currencyPair: 'BTC_NXT',
        period: period,
        start: Math.floor(startDate / 1000).toString(),
        end: Math.floor(endDate / 1000).toString()
      }))
    })
    it('should implement returnCurrencies', async () => {
      let res = { '1CR': { 'maxDailyWithdrawal': 10000, 'txFee': 0.01, 'minConf': 3, 'disabled': 0 }, 'ABY': { 'maxDailyWithdrawal': 10000000, 'txFee': 0.01, 'minConf': 8, 'disabled': 0 } }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnCurrencies())
      t.ok(fakeGet.calledWith({ command: 'returnCurrencies' }))
    })
    it('should implement returnLoanOrders for a given currency', async () => {
      let res = { 'offers': [{ 'rate': '0.00200000', 'amount': '64.66305732', 'rangeMin': 2, 'rangeMax': 8 }], 'demands': [{ 'rate': '0.00170000', 'amount': '26.54848841', 'rangeMin': 2, 'rangeMax': 2 }] }
      fakeGet.returns(res)
      t.deepEqual(res, await plx.returnLoanOrders('BTC'))
      t.ok(fakeGet.calledWith({ command: 'returnLoanOrders', currency: 'BTC' }))
    })
  })
  describe('public api commands - do not call ._get()', () => {
    it('should implement returnChartData that rejects non-valid period parameter', (done) => {
      let plx = new Poloniex()
      let fakeGet = sandbox.stub(plx, '_get')
      let startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
      let endDate = new Date()
      plx.returnChartData('BTC_NXT', 666, startDate, endDate).catch((data) => {
        t.ok(fakeGet.notCalled)
        t.equal(data, 'Error: period must be one of 300, 900, 1800, 7200, 14400 or 86400')
        done()
      })
    })
  })
  describe('#_post', () => {
    let plx, scope, pathname, query, queryNonce, queryNoncePost
    let key = 'public key'
    let secret = 'very secret part that is private'
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex(key, secret)
      pathname = URL_TRADING_API.pathname
      scope = nock(URL_TRADING_API.origin)
      sandbox.useFakeTimers(new Date())
      query = { command: 'illegal' }
      queryNonce = Object.assign({ nonce: sandbox.clock.now * 100 }, query)
      queryNoncePost = querystring.stringify(queryNonce)
    })
    afterEach(() => {
      nock.cleanAll()
      sandbox.reset()
    })
    it('should use the correct trade api url', () => {
      t.equal(TRADING_API, 'https://poloniex.com/tradingApi')
    })
    it('should create a post request to return data', async () => {
      let res = { 'hello': 'world' }
      scope.post(pathname, queryNoncePost).reply(200, res)
      t.deepEqual(res, await plx._post(query))
    })
    it('should sign requests', async () => {
      let signature = crypto
        .createHmac('sha512', secret)
        .update(querystring.stringify(queryNonce))
        .digest('hex')
      nock(URL_TRADING_API.origin)
        .matchHeader('Key', key)
        .matchHeader('Sign', signature)
        .post(URL_TRADING_API.pathname, queryNoncePost)
        .reply(200, {})
      t.deepEqual({}, await plx._post(query))
    })
    it('should limit requests to a configurable limit per second', async () => {
      console.log(`tradingRate: ${plx.tradingRate + 2}`)
      for (let i = 1; i < plx.tradingRate + 2; i++) {
        try {
          if (i < plx.tradingRate + 1) {
            scope.post(pathname, queryNoncePost).reply(200, {})
          }
          await plx._post(query)
          sandbox.clock.tick(10) // add 1ms to time
          queryNonce = Object.assign({ nonce: sandbox.clock.now * 100 }, query)
          queryNoncePost = querystring.stringify(queryNonce)
          t.ok(i < plx.tradingRate + 1, 'the amount of requests is limited')
        } catch (err) {
          t.equal(err, `Error: restricting requests to Poloniex to maximum of ${plx.tradingRate} per second`)
          t.equal(i, plx.tradingRate + 1, 'the last request failed')
        }
      }
    })
    it('should allow to request less than the configurable amount of requests per second', async () => {
      for (let i = 1; i < plx.tradingRate + 4; i++) {
        scope.post(pathname, queryNoncePost).reply(200, {})
        await plx._post(query)
        sandbox.clock.tick(1000 / (plx.tradingRate - 1))
        queryNonce = Object.assign({ nonce: sandbox.clock.now * 100 }, query)
        queryNoncePost = querystring.stringify(queryNonce)
      }
    })
    it('should send a nonce on each request', async () => {
      scope
        .post(pathname, queryNoncePost)
        .reply(200, {})
      t.deepEqual({}, await plx._post(query))
    })
    it('should never repeat the same nonce twice', async () => {
      scope.post(pathname, querystring.stringify(Object.assign({ nonce: (sandbox.clock.now * 100) }, query))).reply(200, {})
      scope.post(pathname, querystring.stringify(Object.assign({ nonce: (sandbox.clock.now * 100 + 1) }, query))).reply(200, {})
      await plx._post(query)
      await plx._post(query)
    })
    it('should raise an error on poloniex errors', (done) => {
      scope.post(pathname, queryNoncePost).reply(200, { error: 'poloniex has problems' })
      plx._post(query).catch((result) => {
        t.equal('Error: HTTP 200 Returned error: poloniex has problems', result)
        done()
      })
    })
    it('should raise an error on http connection errors', (done) => {
      scope.post(pathname, queryNoncePost).replyWithError('request error')
      plx._post(query).catch((result) => {
        t.equal('Error: request error', result)
        done()
      })
    })
    it('should raise an error on status codes other that 2xx with JSON response', (done) => {
      scope.post(pathname, queryNoncePost).reply(404, '{ "error": "Not found" }')
      plx._post(query).catch((result) => {
        t.equal('Error: HTTP 404 Returned error: Not found', result) // Failed to load page, status code: 404', result)
        done()
      })
    })
    it('should raise an error on status codes other that 2xx with non-JSON response', (done) => {
      scope.post(pathname, queryNoncePost).reply(404, 'Not found')
      plx._post(query).catch((result) => {
        t.equal(result, 'Error: HTTP 404 Returned error: Not found') // Failed to load page, status code: 404', result)
        done()
      })
    })
    it('should reject a post when key/secret are not available', (done) => {
      plx = new Poloniex()
      plx._post(query).catch((result) => {
        t.equal('Error: Key and secret are not available for POST requests.', result)
        done()
      })
    })
  })
  describe('trading api commands - call ._post() just once', () => {
    let plx, fakePost, startDate, endDate
    let key = 'public key'
    let secret = 'very secret part that is private'
    beforeEach(() => {
      nock.disableNetConnect()
      plx = new Poloniex(key, secret)
      fakePost = sandbox.stub(plx, '_post')
      startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
      endDate = new Date()
    })
    afterEach(() => {
      t.ok(fakePost.calledOnce)
      sandbox.reset()
    })
    it('should implement returnBalances', async () => {
      let res = { 'BTC': '0.59098578', 'LTC': '3.31117268' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnBalances())
      t.ok(fakePost.calledWith({ command: 'returnBalances' }))
    })
    it('should implement returnCompleteBalances', async () => {
      let res = {
        'LTC': { 'available': '5.015', 'onOrders': '1.0025', 'btcValue': '0.078' },
        'NXT': { 'available': '5.015', 'onOrders': '1.0025', 'btcValue': '0.078' }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnCompleteBalances())
      t.ok(fakePost.calledWith({ command: 'returnCompleteBalances' }))
    })
    it('should allow to ask for returnCompleteBalances on exchange account', async () => {
      // TODO: check what the REAL response is
      let res = {
        'exchange': {
          'LTC': { 'available': '5.015', 'onOrders': '1.0025', 'btcValue': '0.078' },
          'NXT': { 'available': '5.015', 'onOrders': '1.0025', 'btcValue': '0.078' }
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnCompleteBalances(true))
      t.ok(fakePost.calledWith({ command: 'returnCompleteBalances', 'account': 'all' }))
    })
    it('should implement returnDepositAddresses', async () => {
      let res = { 'BTC': '19YqztHmspv2egyD6jQM3yn81x5t5krVdJ', 'LTC': 'LPgf9kjv9H1Vuh4XSaKhzBe8JHdou1WgUB', 'ITC': 'Press Generate..' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnDepositAddresses())
      t.ok(fakePost.calledWith({ command: 'returnDepositAddresses' }))
    })
    it('should implement generateNewAddress for a specified currency', async () => {
      let res = { 'success': 1, 'response': 'CKXbbs8FAVbtEa397gJHSutmrdrBrhUMxe' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.generateNewAddress('BTC'))
      t.ok(fakePost.calledWith({ command: 'generateNewAddress', 'currency': 'BTC' }))
    })
    it('should implement returnDepositsWithdrawals between start and end unix timestamps', async () => {
      let res = {
        'deposits': [{
          'currency': 'BTC',
          'address': 'xxx',
          'amount': '0.01006132',
          'confirmations': 10,
          'txid': '17f819a91369a9ff6c4a...bd6f924137a47701',
          'timestamp': 1399305798,
          'status': 'COMPLETE'
        }, {
          'currency': 'BTC',
          'address': 'yyy',
          'amount': '0.00404104',
          'confirmations': 10,
          'txid': '7acb90965b252e55a894b5...899e4a379d3e43799604695c',
          'timestamp': 1399245916,
          'status': 'COMPLETE'
        }],
        'withdrawals': [{
          'withdrawalNumber': 134933,
          'currency': 'BTC',
          'address': '1N2i5n8DwTGzUq2Vmn9TUL8J1vdr1XBDFg',
          'amount': '5.00010000',
          'timestamp': 1399267904,
          'status': 'COMPLETE: 36e483efa6aff9fd53a23...eb237c210e66cd2b9a2d4a988f8e',
          'ipAddress': '127.0.0.1'
        }]
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnDepositsWithdrawals(startDate, endDate))
      t.ok(fakePost.calledWith({ command: 'returnDepositsWithdrawals', 'start': Math.floor(startDate / 1000).toString(), 'end': Math.floor(endDate / 1000).toString() }))
    })
    it('should implement returnOpenOrders for a provided currencyPair', async () => {
      let res = [{ 'orderNumber': '120466', 'type': 'sell', 'rate': '0.025', 'amount': '100', 'total': '2.5' }, { 'orderNumber': '120467', 'type': 'sell', 'rate': '0.04', 'amount': '100', 'total': '4' }]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnOpenOrders('BTC_XCP'))
      t.ok(fakePost.calledWith({ 'command': 'returnOpenOrders', 'currencyPair': 'BTC_XCP' }))
    })
    it('should implement returnTradeHistory for a all currencies', async () => {
      let res = [{ 'globalTradeID': 25129732, 'tradeID': '6325758', 'date': '2016-04-05 08:08:40', 'rate': '0.02565498', 'amount': '0.10000000', 'total': '0.00256549', 'fee': '0.00200000', 'orderNumber': '34225313575', 'type': 'sell', 'category': 'exchange' }, { 'globalTradeID': 25129628, 'tradeID': '6325741', 'date': '2016-04-05 08:07:55', 'rate': '0.02565499', 'amount': '0.10000000', 'total': '0.00256549', 'fee': '0.00200000', 'orderNumber': '34225195693', 'type': 'buy', 'category': 'exchange' }]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory(true, 'BTC_XCP'))
      t.ok(fakePost.calledWith({ 'command': 'returnTradeHistory', 'currencyPair': 'BTC_XCP' }))
    })
    it('should implement returnTradeHistory with a startDate parameter', async () => {
      let res = [ { globalTradeID: 25129732, tradeID: '6325758', date: '2016-04-05 08:08:40', rate: '0.02565498', amount: '0.10000000', total: '0.00256549', fee: '0.00200000', orderNumber: '34225313575', type: 'sell', category: 'exchange' }, { globalTradeID: 25129628, tradeID: '6325741', date: '2016-04-05 08:07:55', rate: '0.02565499', amount: '0.10000000', total: '0.00256549', fee: '0.00200000', orderNumber: '34225195693', type: 'buy', category: 'exchange' } ]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory(true, 'BTC_XCP', startDate))
      t.ok(fakePost.calledWith({
        command: 'returnTradeHistory',
        currencyPair: 'BTC_XCP',
        start: Math.floor(startDate / 1000).toString()
      }))
    })
    it('should implement returnTradeHistory with a startDate and endDate parameters', async () => {
      let res = [ { globalTradeID: 25129732, tradeID: '6325758', date: '2016-04-05 08:08:40', rate: '0.02565498', amount: '0.10000000', total: '0.00256549', fee: '0.00200000', orderNumber: '34225313575', type: 'sell', category: 'exchange' }, { globalTradeID: 25129628, tradeID: '6325741', date: '2016-04-05 08:07:55', rate: '0.02565499', amount: '0.10000000', total: '0.00256549', fee: '0.00200000', orderNumber: '34225195693', type: 'buy', category: 'exchange' } ]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnTradeHistory(true, 'BTC_XCP', startDate, endDate))
      t.ok(fakePost.calledWith({
        command: 'returnTradeHistory',
        currencyPair: 'BTC_XCP',
        start: Math.floor(startDate / 1000).toString(),
        end: Math.floor(endDate / 1000).toString()
      }))
    })
    it('should implement returnOrderTrades for a provided orderNumber', async () => {
      let res = [ { globalTradeID: 20825863, tradeID: 147142, currencyPair: 'BTC_XVC', type: 'buy', rate: '0.00018500', amount: '455.34206390', total: '0.08423828', fee: '0.00200000', date: '2016-03-14 01:04:36' } ]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnOrderTrades(120466))
      t.ok(fakePost.calledWith({
        command: 'returnOrderTrades',
        orderNumber: '120466'
      }))
    })
    it('should implement buy for currencyPair at the rate and amount specified', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.buy('BTC_ETH', 0.000002, 338.8732))
      t.ok(fakePost.calledWith({
        command: 'buy',
        currencyPair: 'BTC_ETH',
        rate: '0.00000200',
        amount: '338.87320000'
      }))
    })
    it('should implement buy optional type to fillOrKill', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.buy('BTC_ETH', 0.000002, 338.8732, 'fillOrKill'))
      t.ok(fakePost.calledWith({
        command: 'buy',
        currencyPair: 'BTC_ETH',
        rate: '0.00000200',
        amount: '338.87320000',
        fillOrKill: '1'
      }))
    })
    it('should implement buy optional type to immediateOrCancel', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.buy('BTC_ETH', 0.000002, 338.8732, 'immediateOrCancel'))
      t.ok(fakePost.calledWith({
        command: 'buy',
        currencyPair: 'BTC_ETH',
        rate: '0.00000200',
        amount: '338.87320000',
        immediateOrCancel: '1'
      }))
    })
    it('should implement buy optional type to postOnly', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.buy('BTC_ETH', 0.000002, 338.8732, 'postOnly'))
      t.ok(fakePost.calledWith({
        command: 'buy',
        currencyPair: 'BTC_ETH',
        rate: '0.00000200',
        amount: '338.87320000',
        postOnly: '1'
      }))
    })
    it('should implement sell for currencyPair at the rate and amount specified', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.sell('BTC_ETH', 0.000001, 338.8732))
      t.ok(fakePost.calledWith({
        command: 'sell',
        currencyPair: 'BTC_ETH',
        rate: '0.00000100',
        amount: '338.87320000'
      }))
    })
    it('should implement sell optional type to fillOrKill', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.sell('BTC_ETH', 0.000001, 338.8732, 'fillOrKill'))
      t.ok(fakePost.calledWith({
        command: 'sell',
        currencyPair: 'BTC_ETH',
        rate: '0.00000100',
        amount: '338.87320000',
        fillOrKill: '1'
      }))
    })
    it('should implement sell optional type to immediateOrCancel', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.sell('BTC_ETH', 0.000001, 338.8732, 'immediateOrCancel'))
      t.ok(fakePost.calledWith({
        command: 'sell',
        currencyPair: 'BTC_ETH',
        rate: '0.00000100',
        amount: '338.87320000',
        immediateOrCancel: '1'
      }))
    })
    it('should implement sell optional type to postOnly', async () => {
      let res = { orderNumber: 31226040, resultingTrades: [ { amount: '338.8732', date: '2014-10-18 23: 03:21', rate: '0.00000173', total: '0.00058625', tradeID: '16164', type: 'buy' } ] }
      fakePost.returns(res)
      t.deepEqual(res, await plx.sell('BTC_ETH', 0.000001, 338.8732, 'postOnly'))
      t.ok(fakePost.calledWith({
        command: 'sell',
        currencyPair: 'BTC_ETH',
        rate: '0.00000100',
        amount: '338.87320000',
        postOnly: '1'
      }))
    })
    it('should implement cancelOrder for a specified orderNumber', async () => {
      let res = { 'success': 1 }
      fakePost.returns(res)
      t.deepEqual(res, await plx.cancelOrder(120466))
      t.ok(fakePost.calledWith({ command: 'cancelOrder', orderNumber: '120466' }))
    })
    it('should implement moveOrder of a provided orderNumber to modified rate', async () => {
      let res = { success: 1, orderNumber: '239574176', resultingTrades: { BTC_BTS: [] } }
      fakePost.returns(res)
      t.deepEqual(res, await plx.moveOrder(239574176, 0.00000100))
      t.ok(fakePost.calledWith({
        command: 'moveOrder',
        orderNumber: '239574176',
        rate: '0.00000100'
      }))
    })
    it('should implement moveOrder of a provided orderNumber to modified rate and amount', async () => {
      let res = { success: 1, orderNumber: '239574176', resultingTrades: { BTC_BTS: [] } }
      fakePost.returns(res)
      t.deepEqual(res, await plx.moveOrder(239574176, 0.00000100, 338.8732))
      t.ok(fakePost.calledWith({
        command: 'moveOrder',
        orderNumber: '239574176',
        rate: '0.00000100',
        amount: '338.87320000'
      }))
    })
    it('should implement moveOrder with optional type of postOnly', async () => {
      let res = { success: 1, orderNumber: '239574176', resultingTrades: { BTC_BTS: [] } }
      fakePost.returns(res)
      t.deepEqual(res, await plx.moveOrder(239574176, 0.00000100, 338.8732, 'postOnly'))
      t.ok(fakePost.calledWith({
        command: 'moveOrder',
        orderNumber: '239574176',
        rate: '0.00000100',
        amount: '338.87320000',
        postOnly: '1'
      }))
    })
    it('should implement moveOrder with optional type of immediateOrCancel', async () => {
      let res = { success: 1, orderNumber: '239574176', resultingTrades: { BTC_BTS: [] } }
      fakePost.returns(res)
      t.deepEqual(res, await plx.moveOrder(239574176, 0.00000100, 338.8732, 'immediateOrCancel'))
      t.ok(fakePost.calledWith({
        command: 'moveOrder',
        orderNumber: '239574176',
        rate: '0.00000100',
        amount: '338.87320000',
        immediateOrCancel: '1'
      }))
    })
    it('should implement withdraw for a specified currency, amount and address', async () => {
      let res = { 'response': 'Withdrew 2398 NXT.' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.withdraw('NXT', 2398, 'xyz123'))
      t.ok(fakePost.calledWith({
        command: 'withdraw',
        currency: 'NXT',
        amount: '2398.00000000',
        address: 'xyz123'
      }))
    })
    it('should implement withdraw optional paymentId for XMR', async () => {
      let res = { 'response': 'Withdrew 2398 XMR.' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.withdraw('XMR', 2398, 'xyz123', 'd655f4fad16dfc86'))
      t.ok(fakePost.calledWith({
        command: 'withdraw',
        currency: 'XMR',
        amount: '2398.00000000',
        address: 'xyz123',
        paymentId: 'd655f4fad16dfc86'
      }))
    })
    it('should implement returnFeeInfo', async () => {
      let res = {
        'makerFee': '0.00140000',
        'takerFee': '0.00240000',
        'thirtyDayVolume': '612.00248891',
        'nextTier': '1200.00000000'
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnFeeInfo())
      t.ok(fakePost.calledWith({
        command: 'returnFeeInfo'
      }))
    })
    it('should implement returnAvailableAccountBalances', async () => {
      let res = {
        'exchange': { 'BTC': '1.19042859', 'BTM': '386.52379392', 'CHA': '0.50000000', 'DASH': '120.00000000', 'STR': '3205.32958001', 'VNL': '9673.22570147' },
        'margin': { 'BTC': '3.90015637', 'DASH': '250.00238240', 'XMR': '497.12028113' },
        'lending': { 'DASH': '0.01174765', 'LTC': '11.99936230' }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnAvailableAccountBalances())
      t.ok(fakePost.calledWith({
        command: 'returnAvailableAccountBalances'
      }))
    })
    it('should implement returnAvailableAccountBalances for a specific account', async () => {
      let res = { 'BTC': '1.19042859', 'BTM': '386.52379392', 'CHA': '0.50000000', 'DASH': '120.00000000', 'STR': '3205.32958001', 'VNL': '9673.22570147' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnAvailableAccountBalances('exchange'))
      t.ok(fakePost.calledWith({
        command: 'returnAvailableAccountBalances',
        account: 'exchange'
      }))
    })
    it('should implement returnTradableBalances', async () => {
      let res = {
        'BTC_DASH': { 'BTC': '8.50274777', 'DASH': '654.05752077' },
        'BTC_LTC': { 'BTC': '8.50274777', 'LTC': '1214.67825290' },
        'BTC_XMR': { 'BTC': '8.50274777', 'XMR': '3696.84685650' }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnTradableBalances())
      t.ok(fakePost.calledWith({
        command: 'returnTradableBalances'
      }))
    })
    it('should implement transferBalance for the specified currency, amount, toAccount and fromAccount', async () => {
      let res = { 'success': 1, 'message': 'Transferred 2 BTC from exchange to margin account.' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.transferBalance('BTC', 2, 'exchange', 'margin'))
      t.ok(fakePost.calledWith({
        command: 'transferBalance',
        currency: 'BTC',
        amount: '2.00000000',
        fromAccount: 'exchange',
        toAccount: 'margin'
      }))
    })
    it('should implement returnMarginAccountSummary', async () => {
      let res = { 'totalValue': '0.00346561', 'pl': '-0.00001220', 'lendingFees': '0.00000000', 'netValue': '0.00345341', 'totalBorrowedValue': '0.00123220', 'currentMargin': '2.80263755' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnMarginAccountSummary())
      t.ok(fakePost.calledWith({ command: 'returnMarginAccountSummary' }))
    })
    it('should implement marginBuy for a specified currencyPair, rate and amount', async () => {
      let res = {
        success: 1,
        message: 'Margin order placed.',
        orderNumber: '154407998',
        resultingTrades: {
          'BTC_DASH': [ { amount: '1.00000000', date: '2015-05-10 22:47:05', rate: '0.01383692', total: '0.01383692', tradeID: '1213556', type: 'buy' } ]
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.marginBuy('BTC_DASH', 0.01383692, 1))
      t.ok(fakePost.calledWith({
        command: 'marginBuy',
        rate: '0.01383692',
        amount: '1.00000000'
      }))
    })
    it('should implement marginBuy optional lendingRate parameter', async () => {
      let res = {
        success: 1,
        message: 'Margin order placed.',
        orderNumber: '154407998',
        resultingTrades: {
          'BTC_DASH': [ { amount: '1.00000000', date: '2015-05-10 22:47:05', rate: '0.01383692', total: '0.01383692', tradeID: '1213556', type: 'buy' } ]
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.marginBuy('BTC_DASH', 0.01383692, 1, 0.002))
      t.ok(fakePost.calledWith({
        command: 'marginBuy',
        rate: '0.01383692',
        amount: '1.00000000',
        lendingRate: '0.00200000'
      }))
    })
    it('should implement marginSell for a specified currencyPair, rate and amount', async () => {
      let res = {
        success: 1,
        message: 'Margin order placed.',
        orderNumber: '154407998',
        resultingTrades: {
          'BTC_DASH': [ { amount: '1.00000000', date: '2015-05-10 22:47:05', rate: '0.01383692', total: '0.01383692', tradeID: '1213556', type: 'buy' } ]
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.marginSell('BTC_DASH', 0.01383692, 1))
      t.ok(fakePost.calledWith({
        command: 'marginSell',
        rate: '0.01383692',
        amount: '1.00000000'
      }))
    })
    it('should implement marginSell optional lendingRate parameter', async () => {
      let res = {
        success: 1,
        message: 'Margin order placed.',
        orderNumber: '154407998',
        resultingTrades: {
          'BTC_DASH': [ { amount: '1.00000000', date: '2015-05-10 22:47:05', rate: '0.01383692', total: '0.01383692', tradeID: '1213556', type: 'buy' } ]
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.marginSell('BTC_DASH', 0.01383692, 1, 0.002))
      t.ok(fakePost.calledWith({
        command: 'marginSell',
        rate: '0.01383692',
        amount: '1.00000000',
        lendingRate: '0.00200000'
      }))
    })
    it('should implement getMarginPosition for all currency pairs', async () => {
      let res = {
        'amount': '40.94717831', 'total': '-0.09671314', 'basePrice': '0.00236190', 'liquidationPrice': -1, 'pl': '-0.00058655', 'lendingFees': '-0.00000038', 'type': 'long'
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.getMarginPosition())
      t.ok(fakePost.calledWith({
        command: 'getMarginPosition',
        currencyPair: 'all'
      }))
    })
    it('should implement getMarginPosition for the specified currencyPair', async () => {
      let res = {
        'amount': '40.94717831', 'total': '-0.09671314', 'basePrice': '0.00236190', 'liquidationPrice': -1, 'pl': '-0.00058655', 'lendingFees': '-0.00000038', 'type': 'long'
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.getMarginPosition('BTC_ETH'))
      t.ok(fakePost.calledWith({
        command: 'getMarginPosition',
        currencyPair: 'BTC_ETH'
      }))
    })
    it('should implement closeMarginPosition for a specific currencyPair', async () => {
      let res = {
        'success': 1,
        'message': 'Successfully closed margin position.',
        'resultingTrades': {
          'BTC_XMR': [
            { 'amount': '7.09215901', 'date': '2015-05-10 22:38:49', 'rate': '0.00235337', 'total': '0.01669047', 'tradeID': '1213346', 'type': 'sell' },
            { 'amount': '24.00289920', 'date': '2015-05-10 22:38:49', 'rate': '0.00235321', 'total': '0.05648386', 'tradeID': '1213347', 'type': 'sell' }
          ]
        }
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.closeMarginPosition('BTC_ETH'))
      t.ok(fakePost.calledWith({
        command: 'closeMarginPosition',
        currencyPair: 'BTC_ETH'
      }))
    })
    it('should implement createLoanOffer for the currency, amount, duration, lendingRate and autoRenew', async () => {
      let res = { 'success': 1, 'message': 'Loan order placed.', 'orderID': 10590 }
      fakePost.returns(res)
      t.deepEqual(res, await plx.createLoanOffer('BTC', 2, 0.002, false, 2))
      t.ok(fakePost.calledWith({
        command: 'createLoanOffer',
        currency: 'BTC',
        amount: '2.00000000',
        duration: '2',
        lendingRate: '0.00200000',
        autoRenew: '0'
      }))
    })
    it('should implement cancelLoanOffer for a specified orderNumber', async () => {
      let res = { 'success': 1, 'message': 'Loan offer canceled.' }
      fakePost.returns(res)
      t.deepEqual(res, await plx.cancelLoanOffer(10590))
      t.ok(fakePost.calledWith({
        command: 'cancelLoanOffer',
        orderNumber: '10590'
      }))
    })
    it('should implement returnOpenLoanOffers', async () => {
      let res = {
        'BTC': [{ 'id': 10595, 'rate': '0.00020000', 'amount': '3.00000000', 'duration': 2, 'autoRenew': 1, 'date': '2015-05-10 23:33:50' }],
        'LTC': [{ 'id': 10598, 'rate': '0.00002100', 'amount': '10.00000000', 'duration': 2, 'autoRenew': 1, 'date': '2015-05-10 23:34:35' }]
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnOpenLoanOffers())
      t.ok(fakePost.calledWith({
        command: 'returnOpenLoanOffers'
      }))
    })
    it('should implement returnActiveLoans', async () => {
      let res = {
        'provided': [
          { 'id': 75073, 'currency': 'LTC', 'rate': '0.00020000', 'amount': '0.72234880', 'range': 2, 'autoRenew': 0, 'date': '2015-05-10 23:45:05', 'fees': '0.00006000' },
          { 'id': 74961, 'currency': 'LTC', 'rate': '0.00002000', 'amount': '4.43860711', 'range': 2, 'autoRenew': 0, 'date': '2015-05-10 23:45:05', 'fees': '0.00006000' }
        ],
        'used': [
          { 'id': 75238, 'currency': 'BTC', 'rate': '0.00020000', 'amount': '0.04843834', 'range': 2, 'date': '2015-05-10 23:51:12', 'fees': '-0.00000001' }
        ]
      }
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnActiveLoans())
      t.ok(fakePost.calledWith({
        command: 'returnActiveLoans'
      }))
    })
    it('should implement returnLendingHistory within a time range specified by start and end', async () => {
      let res = [
        { 'id': 175589553, 'currency': 'BTC', 'rate': '0.00057400', 'amount': '0.04374404', 'duration': '0.47610000', 'interest': '0.00001196', 'fee': '-0.00000179', 'earned': '0.00001017', 'open': '2016-09-28 06:47:26', 'close': '2016-09-28 18:13:03' }
      ]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnLendingHistory(startDate, endDate))
      t.ok(fakePost.calledWith({
        command: 'returnLendingHistory',
        start: Math.floor(startDate / 1000).toString(),
        end: Math.floor(endDate / 1000).toString()
      }))
    })
    it('should implement returnLendingHistory optional limit parameter', async () => {
      let res = [
        { 'id': 175589553, 'currency': 'BTC', 'rate': '0.00057400', 'amount': '0.04374404', 'duration': '0.47610000', 'interest': '0.00001196', 'fee': '-0.00000179', 'earned': '0.00001017', 'open': '2016-09-28 06:47:26', 'close': '2016-09-28 18:13:03' }
      ]
      fakePost.returns(res)
      t.deepEqual(res, await plx.returnLendingHistory(startDate, endDate, 10))
      t.ok(fakePost.calledWith({
        command: 'returnLendingHistory',
        start: Math.floor(startDate / 1000).toString(),
        end: Math.floor(endDate / 1000).toString(),
        limit: '10'
      }))
    })
    it('should implement toggleAutoRenew for a specified orderNumber', async () => {
      let res = { 'success': 1, 'message': 0 }
      fakePost.returns(res)
      t.deepEqual(res, await plx.toggleAutoRenew(75073))
      t.ok(fakePost.calledWith({
        command: 'toggleAutoRenew',
        orderNumber: '75073'
      }))
    })
  })
})
