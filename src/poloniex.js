/* @flow */

import https from 'https'
import crypto from 'crypto'
import { URL } from 'url'
import querystring from 'querystring'

export const PUBLIC_API: string = 'https://poloniex.com/public'
export const TRADING_API: string = 'https://poloniex.com/tradingApi'

// import Debug from 'debug'
// const debug = Debug('crypto-exchange-api')

export class Poloniex {
  invocations: Array<number>
  key: string | void
  secret: string | void
  maxTrades: number
  precision: number

  constructor (key?: string, secret?: string, maxTrades?: number, precision?: number): void {
    this.invocations = []
    this.key = key
    this.secret = secret
    this.maxTrades = maxTrades || 6
    this.precision = precision || 8
  }

  // Public API Methods

  async returnTicker () {
    return this._get({ command: 'returnTicker' })
  }

  async return24hVolume () {
    return this._get({ command: 'return24hVolume' })
  }

  async returnOrderBook (currency?: string, depth?: number) {
    return this._get({ command: 'returnOrderBook', currencyPair: currency || 'all', depth: depth || 10 })
  }

  async returnTradeHistory (personal: boolean, currency: string, startDate?: Date, endDate?: Date) {
    let req: {
      command: string, currencyPair?: string, start?: string, end?: string
    } = { command: 'returnTradeHistory', currencyPair: currency }
    if (startDate) { req['start'] = Math.floor(startDate / 1000).toString() }
    if (endDate) { req['end'] = Math.floor(endDate / 1000).toString() }
    return (personal ? this._post(req) : this._get(req))
  }

  async returnChartData (currency: string, period: number, startDate: Date, endDate: Date) {
    if (![300, 900, 1800, 7200, 14400, 86400].includes(period)) {
      throw (new Error('period must be one of 300, 900, 1800, 7200, 14400 or 86400'))
    }
    return this._get({
      command: 'returnChartData',
      currencyPair: currency,
      start: Math.floor(startDate / 1000).toString(),
      end: Math.floor(endDate / 1000).toString(),
      period: period
    })
  }

  async returnCurrencies () {
    return this._get({ command: 'returnCurrencies' })
  }

  async returnLoadOrders (currency?: string) {
    return this._get({ command: 'returnLoadOrders', currency: currency })
  }

  // Trading API Methods
  async returnBalances () {
    return this._post({ command: 'returnBalances' })
  }

  async returnCompleteBalances (all?: boolean) {
    let req: { command: string, account?: string } = { command: 'returnCompleteBalances' }
    if (all) {
      Object.assign(req, { 'account': 'all' })
    }
    return this._post(req)
  }

  async returnDepositAddresses () {
    return this._post({ command: 'returnDepositAddresses' })
  }

  async generateNewAddress (currency: string) {
    return this._post({ command: 'generateNewAddress', currency: currency })
  }

  async returnDepositsWithdrawals (startDate: number, endDate: number) {
    return this._post({
      command: 'returnDepositsWithdrawals',
      start: Math.floor(startDate / 1000).toString(),
      end: Math.floor(endDate / 1000).toString()
    })
  }

  async returnOpenOrders (currencyPair: "all" | string) {
    return this._post({
      command: 'returnOpenOrders',
      currencyPair: currencyPair
    })
  }

  async returnOrderTrades (orderNumber: number) {
    return this._post({
      command: 'returnOrderTrades',
      orderNumber: orderNumber.toString()
    })
  }

  async buy (currencyPair: string, rate: number, amount: number) {
    return this._post({
      command: 'buy',
      currencyPair: currencyPair,
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    })
  }

  async sell (currencyPair: string, rate: number, amount: number) {
    return this._post({
      command: 'sell',
      currencyPair: currencyPair,
      rate: rate.toFixed(this.precision),
      amount: amount.toFixed(this.precision)
    })
  }

  async cancelOrder (orderNumber: number) {
    return this._post({
      command: 'cancelOrder',
      orderNumber: orderNumber.toString()
    })
  }

  async moveOrder (orderNumber: number, rate: number, amount?: number) {
    let req: {
      command: string,
      orderNumber: string,
      rate: string,
      amount?: string
    } = {
      command: 'moveOrder',
      orderNumber: orderNumber.toString(),
      rate: rate.toFixed(this.precision)
    }
    if (amount) {
      req['amount'] = amount.toFixed(this.precision)
    }
    return this._post(req)
  }

  async withdraw (currency: string, amount: number, address: string, paymentId?: string) {
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

  async returnFeeInfo () {
    return this._post({ command: 'returnFeeInfo' })
  }

  async returnAvailableAccountBalances (account?: string) {
    let req: {
      command: string, account?: string
    } = { command: 'returnAvailableAccountBalances' }
    if (account) {
      req['account'] = account
    }
    return this._post(req)
  }

  async returnTradableBalances () {
    return this._post({ command: 'returnTradableBalances' })
  }

  async transferBalance (currency: string, amount: number, fromAccount: string, toAccount: string) {
    return this._post({
      command: 'transferBalance',
      currency: currency,
      amount: amount.toFixed(this.precision),
      fromAccount: fromAccount,
      toAccount: toAccount
    })
  }

  async returnMarginAccountSummary () {
    return this._post({ command: 'returnMarginAccountSummary' })
  }

  async marginBuy (currencyPair: string, rate: number, amount: number, lendingRate?: number) {
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

  async marginSell (currencyPair: string, rate: number, amount: number, lendingRate?: number) {
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

  async getMarginPosition (currencyPair?: string) {
    return this._post({ command: 'getMarginPosition', currencyPair: currencyPair || 'all' })
  }

  async closeMarginPosition (currencyPair: string) {
    return this._post({ command: 'closeMarginPosition', currencyPair: currencyPair })
  }

  async createLoanOffer (currency: string, amount: number, rate: number, autoRenew: boolean, duration: number) {
    return this._post({
      command: 'createLoanOffer',
      currency: currency,
      amount: amount.toFixed(this.precision),
      duration: duration.toString(),
      lendingRate: rate.toFixed(this.precision),
      autoRenew: autoRenew ? '1' : '0'
    })
  }

  async cancelLoanOffer (orderNumber: number) {
    return this._post({ command: 'cancelLoanOffer', orderNumber: orderNumber.toString() })
  }

  async returnOpenLoanOffers () {
    return this._post({ command: 'returnOpenLoanOffers' })
  }

  async returnActiveLoans () {
    return this._post({ command: 'returnActiveLoans' })
  }

  async returnLendingHistory (startDate: number, endDate: number, limit?: number) {
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

  toggleAutoRenew (orderNumber: number) {
    return this._post({ command: 'toggleAutoRenew', orderNumber: orderNumber.toString() })
  }

  // Helper methods
  async _post (query: {
    command: string,
    [string]: string
  }) {
    let that: Poloniex = this

    let params: string = querystring.stringify(query)
    return new Promise((resolve, reject) => {
      if (that.key === undefined || that.secret === undefined) {
        return reject(new Error('Key and secret are not available for POST requests.'))
      }

      let ts: number = new Date().getTime()
      that.invocations.push(ts)
      that.invocations = that.invocations.filter((d: number) => {
        return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
      })
      let nonce: number = (ts * 100 - 1) + that.invocations.filter((d: number) => ts === d).length
      if (that.invocations.length >= that.maxTrades + 1) {
        return reject(new Error(`restricting requests to Poloniex to maximum of ${that.maxTrades} per second`))
      }

      let url: URL = new URL(TRADING_API)
      let postData: string = params
      let req: https.ClientRequest = https.request({
        method: 'POST',
        hostname: url.host,
        port: 443,
        path: url.pathname,
        headers: {
          'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Nonce': nonce,
          'Key': that.key,
          'Sign': crypto.createHmac('sha512', that.secret || '').update(postData).digest('hex')
        }
      }, (res: https.IncomingMessage) => {
        let rawData = ''
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`Failed to load page, status code: ${res.statusCode}`))
        }
        res.on('data', chunk => { rawData += chunk })
        res.on('end', () => {
          let response = JSON.parse(rawData)
          if (response.error) {
            return reject(new Error(`Poloniex failure: ${response.error}`))
          }
          return resolve(response)
        })
      })
      req.write(postData)
      req.on('error', reject)
      req.end()
    })
  }

  async _get (query: {} | {
    command: string,
    [string]: string
  }) {
    let that: Poloniex = this
    let url: URL = new URL(PUBLIC_API)
    return new Promise((resolve, reject) => {
      let params: string = '?' + querystring.stringify(query)
      let ts = new Date().getTime()
      that.invocations.push(ts)
      that.invocations = that.invocations.filter((d: number) => {
        return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
      })
      if (that.invocations.length >= 7) {
        return reject(new Error('restricting requests to Poloniex to maximum of 6 per second'))
      }

      let req: https.ClientRequest = https.request({
        method: 'GET',
        host: url.hostname,
        path: `${url.pathname}${params}`,
        headers: {
          'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1'
        }
      }, (res: https.IncomingMessage) => {
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`Failed to load page, status code: ${res.statusCode}`))
        }
        let rawData: string = ''
        res.on('data', (chunk) => { rawData += chunk })
        res.on('end', () => {
          let response = JSON.parse(rawData)
          if (response.error) {
            return reject(new Error(`Poloniex failure: ${response.error}`))
          }
          return resolve(response)
        })
      })
      req.on('error', reject)
      req.end()
    })
  }
}

process.on('unhandledRejection', (err) => {
  console.error(err) // eslint-disable-line no-console
  if (process.env.NODE_ENV !== 'production') { process.exit(1) }
})
