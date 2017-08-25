/* @flow */

import https from 'https'
import crypto from 'crypto'
import { URL } from 'url'
import querystring from 'querystring'

// import Debug from 'debug'
// const debug = Debug('crypto-exchange-api')

export const PUBLIC_API: string = 'https://poloniex.com/public'
export const TRADING_API: string = 'https://poloniex.com/tradingApi'

/**
 * Returns a client for the Poloniex REST API.
 * When key and secret are not used, only public API methods work.
 *
 * Create your API keys at https://poloniex.com/apiKeys
 *
 * @param {string} [key] your API key
 * @param {string} [secret] your API key secret
 * @param {number} [tradingRate=6] rate limit for trading API
 * @param {number} [precision=8] precision for sent prices and amounts
 */
export class Poloniex {
  _publicRateCount: Array<number>
  _tradingRateCount: Array<number>
  key: string | void
  secret: string | void
  tradingRate: number
  precision: number

  constructor (key?: string, secret?: string, tradingRate?: number, precision?: number) {
    this._publicRateCount = []
    this._tradingRateCount = []
    this.key = key
    this.secret = secret
    this.tradingRate = tradingRate || 6
    this.precision = precision || 8
  }

  // Public API Methods

  /**
   * Returns the ticker for all markets.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.returnTicker()
   * // => {"BTC_LTC":{"last":"0.0251","lowestAsk":"0.02589999","highestBid":"0.0251","percentChange":"0.02390438", "baseVolume":"6.16485315","quoteVolume":"245.82513926"},"BTC_NXT":{"last":"0.00005730","lowestAsk":"0.00005710", "highestBid":"0.00004903","percentChange":"0.16701570","baseVolume":"0.45347489","quoteVolume":"9094"}, ... }
   */
  returnTicker () {
    return this._get({ command: 'returnTicker' })
  }

  /**
   * Returns the 24-hour volume for all markets, plus totals for primary
   * currencies.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.return24hVolume()
   * // => {"BTC_LTC":{"BTC":"2.23248854","LTC":"87.10381314"},"BTC_NXT":{"BTC":"0.981616","NXT":"14145"}, ... "totalBTC":"81.89657704","totalLTC":"78.52083806"}
   */
  return24hVolume () {
    return this._get({ command: 'return24hVolume' })
  }

  /**
   * Returns the order book for a given market, as well as a sequence number for
   * use with the Push API and an indicator specifying whether the market is
   * frozen. You may set `currencyPair` to `all` to get the order books of all
   * markets.
   *
   * @param {string} currencyPair the market to query, or `all` for all markets
   * @param {number} [depth=10] how many order book items to return from bid
   * list and ask list
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.returnOrderBook('BTC_NXT')
   * // => {"asks":[[0.00007600,1164],[0.00007620,1300], ... ], "bids":[[0.00006901,200],[0.00006900,408], ... ], "isFrozen": 0, "seq": 18849}
   * await plx.returnOrderBook() // `all` markets
   * // => {"BTC_NXT":{"asks":[[0.00007600,1164],[0.00007620,1300], ... ], "bids":[[0.00006901,200],[0.00006900,408], ... ], "isFrozen": 0, "seq": 149},"BTC_XMR":...}
   */
  returnOrderBook (currencyPair?: string, depth?: number) {
    return this._get({ command: 'returnOrderBook', currencyPair: currencyPair || 'all', depth: depth || 10 })
  }

  /**
   * Returns the past 200 trades for a given market, or up to 50,000 trades
   * between a range specified by the "startDate" and "endDate" parameters.
   *
   * @param {boolean} personal true when using private api, and false when using
   * public api
   * @param {string} currencyPair the market to query
   * @param {Date} [startDate] date for first event
   * @param {Date} [endDate] date for last event
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plxPublic = new Poloniex()
   * await plx.returnTradeHistory(false, 'BTC_NXT')
   * // => [{"date":"2014-02-10 04:23:23","type":"buy","rate":"0.00007600","amount":"140","total":"0.01064"},{"date":"2014-02-10 01:19:37","type":"buy","rate":"0.00007600","amount":"655","total":"0.04978"}, ... ]
   * let plxPrivate = new Poloniex(key, secret)
   */
  returnTradeHistory (personal: boolean, currencyPair: string, startDate?: Date, endDate?: Date) {
    let req: {
      command: string, currencyPair?: string, start?: string, end?: string
    } = { command: 'returnTradeHistory', currencyPair: currencyPair }
    if (startDate) { req['start'] = Math.floor(startDate / 1000).toString() }
    if (endDate) { req['end'] = Math.floor(endDate / 1000).toString() }
    return (personal ? this._post(req) : this._get(req))
  }

  /**
   * Returns candlestick chart data. Required parameters are `currencyPair`,
   * `period` (candlestick period in seconds; valid values are `300`, `900`,
   * `1800`, `7200`, `14400`, and `86400`), `start`, and `end`. `Start` and
   * `end` are used to specify the date range for the data returned.
   *
   * @param {string} currencyPair the market to query
   * @param {number} period candlestick period in seconds, 300, 900, 1800, 7200,
   * 14400 and 86400
   * @param {Date} startDate date for first event
   * @param {Date} endDate date for last event
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.returnChartData('BTC_XMR', 300)
   * // => [{"date":1405699200,"high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,"volume":44.11655644,"quoteVolume":10259.29079097,"weightedAverage":0.00430015}, ...]
   */
  async returnChartData (currencyPair: string, period: number, startDate: Date, endDate: Date) {
    if (![300, 900, 1800, 7200, 14400, 86400].includes(period)) {
      throw (new Error('period must be one of 300, 900, 1800, 7200, 14400 or 86400'))
    }
    return this._get({
      command: 'returnChartData',
      currencyPair: currencyPair,
      start: Math.floor(startDate / 1000).toString(),
      end: Math.floor(endDate / 1000).toString(),
      period: period
    })
  }

  /**
   * Returns information about currencies.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.returnCurrencies()
   * // => {"1CR":{"maxDailyWithdrawal":10000,"txFee":0.01,"minConf":3,"disabled":0},"ABY":{"maxDailyWithdrawal":10000000,"txFee":0.01,"minConf":8,"disabled":0}, ... }
   */
  returnCurrencies () {
    return this._get({ command: 'returnCurrencies' })
  }

  /**
   * Returns the list of loan offers and demands for a given currency, specified
   * by the `currency` parameter.
   *
   * @param {string} [currency] chosen currency, omit to receive loan orders for
   * all currencies
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex()
   * await plx.returnCurrencies()
   * // => {"1CR":{"maxDailyWithdrawal":10000,"txFee":0.01,"minConf":3,"disabled":0},"ABY":{"maxDailyWithdrawal":10000000,"txFee":0.01,"minConf":8,"disabled":0}, ... }
   */
  returnLoanOrders (currency?: string) {
    return this._get({ command: 'returnLoanOrders', currency: currency })
  }

  // Trading API Methods

  /**
   * Returns all of your available balances.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnBalances()
   * // => {"BTC":"0.59098578","LTC":"3.31117268", ... }
   */
  returnBalances () {
    return this._post({ command: 'returnBalances' })
  }

  /**
   * Returns all of your balances, including available balance, balance on
   * orders, and the estimated BTC value of your balance. By default, this call
   * is limited to your exchange account; set the `account` parameter to `all`
   * to include your margin and lending accounts.
   *
   * @param {boolean} all include margin and lending accounts as well as
   * exchange account
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnCompleteBalances() // returns just the exchange account
   * // => {"LTC":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"},"NXT:{...} ... }
   * await plx.returnCompleteBalances(true)
   * // => {"exchange":{"LTC":{"available":"5.015","onOrders":"1.0025","btcValue":"0.078"},"NXT:{...} ... }, "margin": {...}, "lending": {...}}
   */
  returnCompleteBalances (all?: boolean) {
    let req: { command: string, account?: string } = { command: 'returnCompleteBalances' }
    if (all) {
      Object.assign(req, { 'account': 'all' })
    }
    return this._post(req)
  }

  /**
   * Returns all of your deposit addresses.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnDepositAddresses()
   * // => {"BTC":"19YqztHmspv2egyD6jQM3yn81x5t5krVdJ","LTC":"LPgf9kjv9H1Vuh4XSaKhzBe8JHdou1WgUB", ... "ITC":"Press Generate.." ... }
   */
  returnDepositAddresses () {
    return this._post({ command: 'returnDepositAddresses' })
  }

  /**
   * Generates a new deposit address for the currency specified by the
   * `currency` parameter.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.generateNewAddress('BTC')
   * // => {"success":1,"response":"CKXbbs8FAVbtEa397gJHSutmrdrBrhUMxe"}
   */
  generateNewAddress (currency: string) {
    return this._post({ command: 'generateNewAddress', currency: currency })
  }

  /**
   * Returns your deposit and withdrawal history within a range, specified by
   * the `start` and `end` parameters.
   *
   * @param {Date} startDate date for start of range
   * @param {Date} endDate date for end of range
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnDepositsWithdrawals(new Date() - 3600, new Date())
   * // => {"deposits":[{"currency":"BTC","address":"...","amount":"0.01006132","confirmations":10,"txid":"17f819a91369a9ff6c4a34216d434597cfc1b4a3d0489b46bd6f924137a47701","timestamp":1399305798,"status":"COMPLETE"},{"currency":"BTC","address":"...","amount":"0.00404104","confirmations":10,"txid":"7acb90965b252e55a894b535ef0b0b65f45821f2899e4a379d3e43799604695c","timestamp":1399245916,"status":"COMPLETE"}],"withdrawals":[{"withdrawalNumber":134933,"currency":"BTC","address":"1N2i5n8DwTGzUq2Vmn9TUL8J1vdr1XBDFg","amount":"5.00010000","timestamp":1399267904,"status":"COMPLETE: 36e483efa6aff9fd53a235177579d98451c4eb237c210e66cd2b9a2d4a988f8e","ipAddress":"..."}]}
   *
   */
  returnDepositsWithdrawals (startDate: Date, endDate: Date) {
    return this._post({
      command: 'returnDepositsWithdrawals',
      start: Math.floor(startDate / 1000).toString(),
      end: Math.floor(endDate / 1000).toString()
    })
  }

  /**
   * Returns your open orders for a given market, specified by the
   * `currencyPair` parameter. Set `currencyPair` to `all` to return open orders
   * for all markets.
   *
   * @param {string} [currencyPair='all'] which market to return, `all` for all markets
   * exchange account
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnOpenOrders('BTC_ETH')
   * // => [{"orderNumber":"120466","type":"sell","rate":"0.025","amount":"100","total":"2.5"},{"orderNumber":"120467","type":"sell","rate":"0.04","amount":"100","total":"4"}, ... ]
   * await plx.returnOpenOrders()
   * // => {"BTC_1CR":[],"BTC_AC":[{"orderNumber":"120466","type":"sell","rate":"0.025","amount":"100","total":"2.5"},{"orderNumber":"120467","type":"sell","rate":"0.04","amount":"100","total":"4"}], ... }
   */
  returnOpenOrders (currencyPair: 'all' | string) {
    return this._post({
      command: 'returnOpenOrders',
      currencyPair: currencyPair
    })
  }

  /**
   * Returns all trades involving a given order, specified by the `orderNumber`
   * parameter. If no trades for the order have occurred or you specify an order
   * that does not belong to you, you will receive an error.
   *
   * @param {number} orderNumber a specific order number, must be one of yours
   * exchange account
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnOrderTrades(1204660)
   * // => [{"globalTradeID": 20825863, "tradeID": 147142, "currencyPair": "BTC_XVC", "type": "buy", "rate": "0.00018500", "amount": "455.34206390", "total": "0.08423828", "fee": "0.00200000", "date": "2016-03-14 01:04:36"}, ...]
   */
  returnOrderTrades (orderNumber: number) {
    return this._post({
      command: 'returnOrderTrades',
      orderNumber: orderNumber.toString()
    })
  }

  /**
   * Places a limit buy order in a given market. Required parameters are
   * `currencyPair`, `rate`, and `amount`. If successful, the method will return
   * the order number.
   *
   * You may optionally set `type` to `fillOrKill`, `immediateOrCancel` or
   * `postOnly`.
   *
   * A fill-or-kill order will either fill in its entirety or be completely
   * aborted.
   *
   * An immediate-or-cancel order can be partially or completely filled, but any
   * portion of the order that cannot be filled immediately will be canceled
   * rather than left on the order book.
   *
   * A post-only order will only be placed if no portion of it fills
   * immediately; this guarantees you will never pay the taker fee on any part
   * of the order that fills.
   *
   * @param {string} currencyPair the market to buy
   * @param {number} rate price in market base coin
   * @param {number} amount amount of market coin to buy
   * @param {string} [type] set to one of `fillOrKill`, `immediateOrCancel` or
   * `postOnly`
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.buy('BTC_ETH', 0.079, 20, 'postOnly')
   * // => {"orderNumber":31226040,"resultingTrades":[{"amount":"338.8732","date":"2014-10-18 23:03:21","rate":"0.00000173","total":"0.00058625","tradeID":"16164","type":"buy"}]}
   */
  buy (currencyPair: string, rate: number, amount: number, type?: 'fillOrKill' | 'immediateOrCancel' | 'postOnly') {
    let req : {
      command: string, currencyPair: string, rate: string, amount: string, [string]: string
    } = {
      command: 'buy',
      currencyPair: currencyPair,
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    }
    if (type) {
      req[type] = '1'
    }
    return this._post(req)
  }

  /**
   * Places a limit sell order in a given market. Required parameters are
   * `currencyPair`, `rate`, and `amount`. If successful, the method will return
   * the order number.
   *
   * You may optionally set `type` to `fillOrKill`, `immediateOrCancel` or
   * `postOnly`.
   *
   * A fill-or-kill order will either fill in its entirety or be completely
   * aborted.
   *
   * An immediate-or-cancel order can be partially or completely filled, but any
   * portion of the order that cannot be filled immediately will be canceled
   * rather than left on the order book.
   *
   * A post-only order will only be placed if no portion of it fills
   * immediately; this guarantees you will never pay the taker fee on any part
   * of the order that fills.
   *
   * @param {string} currencyPair the market to sell
   * @param {number} rate price in market base coin
   * @param {number} amount amount of market coin to sell
   * @param {string} [type] set to one of `fillOrKill`, `immediateOrCancel` or
   * `postOnly`
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.sell('BTC_ETH', 0.079, 20)
   * // => {"orderNumber":31226040,"resultingTrades":[{"amount":"338.8732","date":"2014-10-18 23:03:21","rate":"0.00000173","total":"0.00058625","tradeID":"16164","type":"buy"}]}
   * await plx.sell('BTC_ETH', 0.079, 20, 'postOnly')
   * // => {"orderNumber":31226040,"resultingTrades":[{"amount":"338.8732","date":"2014-10-18 23:03:21","rate":"0.00000173","total":"0.00058625","tradeID":"16164","type":"buy"}]}
   */
  sell (currencyPair: string, rate: number, amount: number, type?: 'fillOrKill' | 'immediateOrCancel' | 'postOnly') {
    let req : {
      command: string, currencyPair: string, rate: string, amount: string, [string]: string
    } = {
      command: 'sell',
      currencyPair: currencyPair,
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    }
    if (type) {
      req[type] = '1'
    }
    return this._post(req)
  }

  /**
   * Cancels an order you have placed in a given market. Required parameter is
   * `orderNumber`.
   *
   * @param {number} orderNumber a specific order number to cancel
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.cancelOrder(31226040)
   * // => {"success":1}
   */
  cancelOrder (orderNumber: number) {
    return this._post({
      command: 'cancelOrder',
      orderNumber: orderNumber.toString()
    })
  }

  /**
   * Cancels an order and places a new one of the same type in a single atomic
   * transaction, meaning either both operations will succeed or both will fail.
   *
   * Required parameters are `orderNumber` and `rate`; you may optionally
   * specify `amount` if you wish to change the amount of the new order.
   *
   * A `type` of `postOnly` or `immediateOrCancel` may be specified for exchange
   * orders, but will have no effect on margin orders.
   *
   * @param {number} orderNumber a specific order number to modify
   * @param {number} rate modified rate
   * @param {number} [amount] modified amount
   * @param {'postOnly'|'immediateOrCancel'} [type] type of order modification
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.moveOrder(31226040, 0.079, 20, 'postOnly')
   * // => {"success":1,"orderNumber":"239574176","resultingTrades":{"BTC_BTS":[]}}
   */
  moveOrder (orderNumber: number, rate: number, amount?: number, type?: 'postOnly' | 'immediateOrCancel') {
    let req: {
      command: string,
      orderNumber: string,
      rate: string,
      amount?: string,
      [string]: string
    } = {
      command: 'moveOrder',
      orderNumber: orderNumber.toString(),
      rate: rate.toFixed(this.precision)
    }
    if (amount) {
      req['amount'] = amount.toFixed(this.precision)
    }
    if (type) {
      req[type] = '1'
    }
    return this._post(req)
  }

  /**
   * Immediately places a withdrawal for a given currency, with no email
   * confirmation. In order to use this method, the withdrawal privilege must be
   * enabled for your API key. Required parameters are `currency`,
   * `amount`, and `address`. For XMR withdrawals, you may optionally specify
   * `paymentId`.
   *
   * @param {string} currency which currency to withdraw
   * @param {number} amount amount of coins to withdraw
   * @param {string} address destination address for withdrawal
   * @param {string} [paymentId] paymendid for XMR
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.withdraw('BTC', 1.2, '18Npsu6qDjyD46S87DPU8YvAk1MWW6puBu')
   * // => {"response":"Withdrew 1.2 BTC."}
   */
  withdraw (currency: string, amount: number, address: string, paymentId?: string) {
    let req: {
      command: string,
      currency: string,
      amount: string,
      address: string,
      paymentId?: string
    } = {
      command: 'withdraw',
      currency: currency,
      amount: amount.toFixed(this.precision),
      address: address
    }
    if (paymentId) {
      req['paymentId'] = paymentId
    }
    return this._post(req)
  }

  /**
   * If you are enrolled in the maker-taker fee schedule, returns your current
   * trading fees and trailing 30-day volume in BTC. This information is updated
   * once every 24 hours.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnFeeInfo()
   * // => {"makerFee": "0.00140000", "takerFee": "0.00240000", "thirtyDayVolume": "612.00248891", "nextTier": "1200.00000000"}
   */
  returnFeeInfo () {
    return this._post({ command: 'returnFeeInfo' })
  }

  /**
   * Returns your balances sorted by account. You may optionally specify the
   * `account` parameter if you wish to fetch only the balances of one account.
   * Please note that balances in your margin account may not be accessible if
   * you have any open margin positions or orders.
   *
   * @param {string} [account] choose which account balance to show, default shows
   * all accounts
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnAvailableAccountBalances()
   * // => {"exchange":{"BTC":"1.19042859","BTM":"386.52379392","CHA":"0.50000000","DASH":"120.00000000","STR":"3205.32958001", "VNL":"9673.22570147"},"margin":{"BTC":"3.90015637","DASH":"250.00238240","XMR":"497.12028113"},"lending":{"DASH":"0.01174765","LTC":"11.99936230"}}
   * await plx.returnAvailableAccountBalances('exchange')
   * // => {"BTC":"1.19042859","BTM":"386.52379392","CHA":"0.50000000","DASH":"120.00000000","STR":"3205.32958001", "VNL":"9673.22570147"}
   */
  returnAvailableAccountBalances (account?: string) {
    let req: {
      command: string, account?: string
    } = { command: 'returnAvailableAccountBalances' }
    if (account) {
      req['account'] = account
    }
    return this._post(req)
  }

  /**
   * Returns your current tradable balances for each currency in each market for
   * which margin trading is enabled. Please note that these balances may vary
   * continually with market conditions.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnTradableBalances()
   * // => {"BTC_DASH":{"BTC":"8.50274777","DASH":"654.05752077"},"BTC_LTC":{"BTC":"8.50274777","LTC":"1214.67825290"},"BTC_XMR":{"BTC":"8.50274777","XMR":"3696.84685650"}}
   */
  returnTradableBalances () {
    return this._post({ command: 'returnTradableBalances' })
  }

  /**
   * Transfers funds from one account to another (e.g. from your exchange
   * account to your margin account). Required parameters are `currency`,
   * `amount`, `fromAccount`, and `toAccount`.
   *
   * @param {string} currency which currency to transfer
   * @param {number} amount amount of currency to transfer
   * @param {'exchange'|'margin'|'lending'} fromAccount source account
   * @param {'exchange'|'margin'|'lending'} toAccount destination account
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.transferBalance('BTC', 2, 'exchange', 'margin')
   * // => {"success":1,"message":"Transferred 2 BTC from exchange to margin account."}
   */
  transferBalance (currency: string, amount: number, fromAccount: 'exchange' | 'margin' | 'lending', toAccount: 'exchange' | 'margin' | 'lending') {
    return this._post({
      command: 'transferBalance',
      currency: currency,
      amount: amount.toFixed(this.precision),
      fromAccount: fromAccount,
      toAccount: toAccount
    })
  }

  /**
   * Returns a summary of your entire margin account. This is the same
   * information you will find in the Margin Account section of the Margin
   * Trading page, under the Markets list.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnMarginAccountSummary()
   * // => {"totalValue": "0.00346561","pl": "-0.00001220","lendingFees": "0.00000000","netValue": "0.00345341","totalBorrowedValue": "0.00123220","currentMargin": "2.80263755"}
   */
  returnMarginAccountSummary () {
    return this._post({ command: 'returnMarginAccountSummary' })
  }

  /**
   * Places a margin buy order in a given market. Required parameters are
   * `currencyPair`, `rate`, and `amount`. You may optionally specify a maximum
   * lending rate using the `lendingRate` parameter. If successful, the method
   * will return the order number and any trades immediately resulting from your
   * order.
   *
   * @param {string} currencyPair the currency pair to margin buy
   * @param {number} rate the price for buy order
   * @param {number} amount the amount of currency to buy
   * @param {number} [lendingRate] the maximum rate at which to lend currency
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.marginBuy('BTC_DASH', 0.01383692, 1)
   * // => {"success":1,"message":"Margin order placed.","orderNumber":"154407998","resultingTrades":{"BTC_DASH":[{"amount":"1.00000000","date":"2015-05-10 22:47:05","rate":"0.01383692","total":"0.01383692","tradeID":"1213556","type":"buy"}]}}
   */
  marginBuy (currencyPair: string, rate: number, amount: number, lendingRate?: number) {
    let req: {
      command: string,
      rate: string,
      amount: string,
      lendingRate?: string
    } = {
      command: 'marginBuy',
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    }
    if (lendingRate) {
      req['lendingRate'] = lendingRate.toFixed(this.precision)
    }
    return this._post(req)
  }

  /**
   * Places a margin sell order in a given market. Required parameters are
   * `currencyPair`, `rate`, and `amount`. You may optionally specify a maximum
   * lending rate using the `lendingRate` parameter. If successful, the method
   * will return the order number and any trades immediately resulting from your
   * order.
   *
   * @param {string} currencyPair the currency pair to margin sell
   * @param {number} rate the price for sell order
   * @param {number} amount the amount of currency to sell
   * @param {number} [lendingRate] the maximum rate at which to lend currency
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.marginSell('BTC_DASH', 0.01383692, 1)
   * // => {"success":1,"message":"Margin order placed.","orderNumber":"154407998","resultingTrades":{"BTC_DASH":[{"amount":"1.00000000","date":"2015-05-10 22:47:05","rate":"0.01383692","total":"0.01383692","tradeID":"1213556","type":"sell"}]}}
   */
  marginSell (currencyPair: string, rate: number, amount: number, lendingRate?: number) {
    let req: {
      command: string,
      rate: string,
      amount: string,
      lendingRate?: string
    } = {
      command: 'marginSell',
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    }
    if (lendingRate) {
      req['lendingRate'] = lendingRate.toFixed(this.precision)
    }
    return this._post(req)
  }

  /**
   * Returns information about your margin position in a given market, specified
   * by the `currencyPair` parameter. You may set `currencyPair` to `all`
   * if you wish to fetch all of your margin positions at once. If you have no
   * margin position in the specified market, `type` will be set to `none`.
   *
   * `liquidationPrice` is an estimate, and does not necessarily represent the
   * price at which an actual forced liquidation will occur. If you have no
   * liquidation price, the value will be -1.
   *
   * @param {string|'all'} currencyPair the currency pair to query
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.getMarginPosition('BTC_NXT')
   * // => {"amount":"40.94717831","total":"-0.09671314",""basePrice":"0.00236190","liquidationPrice":-1,"pl":"-0.00058655", "lendingFees":"-0.00000038","type":"long"}
   */
  getMarginPosition (currencyPair?: string | 'all') {
    return this._post({ command: 'getMarginPosition', currencyPair: currencyPair || 'all' })
  }

  /**
   * Closes your margin position in a given market (specified by the
   * `currencyPair` parameter) using a market order. This call will also return
   * success if you do not have an open position in the specified market.
   *
   * @param {string} currencyPair the currency pair to close margin position for
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.closeMarginPosition('BTC_XMR')
   * // => {"success":1,"message":"Successfully closed margin position.","resultingTrades":{"BTC_XMR":[{"amount":"7.09215901","date":"2015-05-10 22:38:49","rate":"0.00235337","total":"0.01669047","tradeID":"1213346","type":"sell"},{"amount":"24.00289920","date":"2015-05-10 22:38:49","rate":"0.00235321","total":"0.05648386","tradeID":"1213347","type":"sell"}]}}
   */
  closeMarginPosition (currencyPair: string) {
    return this._post({ command: 'closeMarginPosition', currencyPair: currencyPair })
  }

  /**
   * Creates a loan offer for a given currency. Required parameters are
   * `currency`, `amount`, `duration`, `autoRenew`, and `lendingRate`.
   *
   * @param {string} currency which currency to lend
   * @param {number} amount amount of currency to lend
   * @param {number} rate the rate at which lend is oferred
   * @param {boolean} autoRenew should loan renew after expiry
   * @param {number} duration how long should the loan be oferred for
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.createLoanOffer('BTC', 2, 0.02, false, 2)
   * // => {"success":1,"message":"Loan order placed.","orderID":10590}
   */
  createLoanOffer (currency: string, amount: number, rate: number, autoRenew: boolean, duration: number) {
    return this._post({
      command: 'createLoanOffer',
      currency: currency,
      amount: amount.toFixed(this.precision),
      duration: duration.toString(),
      lendingRate: rate.toFixed(this.precision),
      autoRenew: autoRenew ? '1' : '0'
    })
  }

  /**
   * Cancels a loan offer specified by the "orderNumber" parameter.
   *
   * @param {number} orderNumber which loan offer order to cancel
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.cancelLoanOffer(10590)
   * // => {"success":1,"message":"Loan order placed.","orderID":10590}
   */
  cancelLoanOffer (orderNumber: number) {
    return this._post({ command: 'cancelLoanOffer', orderNumber: orderNumber.toString() })
  }

  /**
   * Returns your open loan offers for each currency.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnOpenLoanOffers()
   * // => {"BTC":[{"id":10595,"rate":"0.00020000","amount":"3.00000000","duration":2,"autoRenew":1,"date":"2015-05-10 23:33:50"}],"LTC":[{"id":10598,"rate":"0.00002100","amount":"10.00000000","duration":2,"autoRenew":1,"date":"2015-05-10 23:34:35"}]}
   */
  returnOpenLoanOffers () {
    return this._post({ command: 'returnOpenLoanOffers' })
  }

  /**
   * Returns your active loans for each currency.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnActiveLoans()
   * // => {"provided":[{"id":75073,"currency":"LTC","rate":"0.00020000","amount":"0.72234880","range":2,"autoRenew":0,"date":"2015-05-10 23:45:05","fees":"0.00006000"},{"id":74961,"currency":"LTC","rate":"0.00002000","amount":"4.43860711","range":2,"autoRenew":0,"date":"2015-05-10 23:45:05","fees":"0.00006000"}],"used":[{"id":75238,"currency":"BTC","rate":"0.00020000","amount":"0.04843834","range":2,"date":"2015-05-10 23:51:12","fees":"-0.00000001"}]}
   */
  returnActiveLoans () {
    return this._post({ command: 'returnActiveLoans' })
  }

  /**
   * Returns your lending history within a time range specified by the `start`
   * and `end` parameters. `limit` may also be specified to limit the number of
   * rows returned.
   *
   * @param {Date} startDate date range start
   * @param {Date} endDate date range finish
   * @param {number} limit limit results to a specific number
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.returnLendingHistory(new Date() - 3600, new Date())
   * // => [{ "id": 175589553, "currency": "BTC", "rate": "0.00057400", "amount": "0.04374404", "duration": "0.47610000", "interest": "0.00001196", "fee": "-0.00000179", "earned": "0.00001017", "open": "2016-09-28 06:47:26", "close": "2016-09-28 18:13:03" }]
   */
  returnLendingHistory (startDate: Date, endDate: Date, limit?: number) {
    let req: {
      command: string,
      start: string,
      end: string,
      limit?: string
    } = {
      command: 'returnLendingHistory',
      start: Math.floor(startDate / 1000).toString(),
      end: Math.floor(endDate / 1000).toString()
    }
    if (limit) {
      req['limit'] = limit.toString()
    }
    return this._post(req)
  }

  /**
   * Toggles the autoRenew setting on an active loan, specified by the
   * `orderNumber` parameter. If successful, `message` will indicate the new
   * autoRenew setting.
   *
   * @returns {Promise<object, Error>} A promise that returns the result JSON as
   * an object if resolved, or an Error if rejected.
   * @example
   * let plx = new Poloniex(key, secret)
   * await plx.toggleAutoRenew(10590)0
   * // => {"success":1,"message":0}
   */
  toggleAutoRenew (orderNumber: number) {
    return this._post({ command: 'toggleAutoRenew', orderNumber: orderNumber.toString() })
  }

  // Helper methods

  _checkRateLimit (ts: number, limit: number, rates: Array<number>) {
    rates.push(ts)
    rates = rates.filter((d: number) => {
      return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
    })
    return rates.length <= limit
  }

  _httpsRequest (options: {}, body?: string) {
    return new Promise((resolve, reject) => {
      let req : https.ClientRequest = https.request(options, (res: https.IncomingMessage) => {
        let rawData: string = ''
        res.on('data', (chunk) => { rawData += chunk })
        res.on('end', () => {
          return resolve({ statusCode: res.statusCode, data: rawData })
        })
      })
      req.on('error', reject)
      if (body) {
        req.write(body)
      }
      req.end()
    })
  }

  /**
   * Parse https.request responses
   *
   * @private
   */
  _resParse (response: { statusCode: number, data: string }) {
    let resObj
    try {
      resObj = JSON.parse(response.data)
    } catch (e) {
      throw new Error(`HTTP ${response.statusCode} Returned error: ${response.data}`)
    }
    if (resObj.error) {
      throw new Error(`HTTP ${response.statusCode} Returned error: ${resObj.error}`)
    }
    return resObj
  }

  /**
   * GET request data from the Public API endpoint
   *
   * @private
   * @param {object} query command and parameters to GET request from the API endpoint
   * @returns {Promise<object, Error>} API results or an error
   */
  async _get (query: {} | {
    command: string,
    [string]: string
  }) {
    let ts = new Date().getTime()
    if (!await this._checkRateLimit(ts, 6, this._publicRateCount)) { throw new Error('restricting requests to Poloniex to maximum of 6 per second') }
    let url: URL = new URL(PUBLIC_API)
    const options = {
      method: 'GET',
      host: url.hostname,
      path: url.pathname + '?' + querystring.stringify(query),
      headers: {
        'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1'
      }
    }
    return this._resParse(await this._httpsRequest(options))
  }

  /**
   * POST data to the Trading API endpoint
   *
   * @private
   * @param {object} query command and parameters to POST to API endpoint
   * @returns {Promise<object, Error>} API results or an error
   */
  async _post (query: {
    command: string,
    [string]: string
  }) {
    let ts = new Date().getTime()
    if (this.key === undefined || this.secret === undefined) {
      throw new Error('Key and secret are not available for POST requests.')
    }
    if (!await this._checkRateLimit(ts, this.tradingRate, this._tradingRateCount)) {
      throw new Error(`restricting requests to Poloniex to maximum of ${this.tradingRate} per second`)
    }
    let url: URL = new URL(TRADING_API)
    // unique nonce ever increasing never decreasing
    let nonce: number = (ts * 100 - 1) + this._tradingRateCount.filter((d: number) => ts === d).length
    let body: string = querystring.stringify(Object.assign({ nonce: nonce }, query))
    const options = {
      method: 'POST',
      host: url.hostname,
      path: url.pathname,
      headers: {
        'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Key': this.key,
        'Sign': crypto.createHmac('sha512', this.secret || '').update(body).digest('hex')
      }
    }
    return this._resParse(await this._httpsRequest(options, body))
  }
}
