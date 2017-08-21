/* @flow */

import Debug from 'debug';
import https from 'https'
import crypto from 'crypto'
import { URL, URLSearchParams } from 'url'

export const PUBLIC_API = 'https://poloniex.com/public'
export const TRADING_API = 'https://poloniex.com/tradingApi'

const debug = Debug('crypto-exchange-api')

export class Poloniex {
  invocations: Array<number>
  key: string
  secret: string
  maxTrades: number

  constructor(key?: string, secret?: string, maxTrades?: number) {
    this.invocations = []
    this.key = key || ''
    this.secret = secret || ''
    this.maxTrades = maxTrades || 6
  }

  // Public API Methods

  async returnTicker() {
    return this._get({command: 'returnTicker'})
  }

  async return24hVolume() {
    return this._get({command: 'return24hVolume'})
  }

  async returnOrderBook(currency?: string, depth?: number) {
    return this._get({command: 'returnOrderBook', currencyPair: currency || 'all', depth: depth || 10 })
  }

  async returnTradeHistory(currency: string, startDate?: Date, endDate?: Date) {
    let req = { command: 'returnTradeHistory', currencyPair: currency };
    if (startDate)
      Object.assign(req, { start: Math.floor(startDate/1000) })
    if (endDate)
      Object.assign(req, { end: Math.floor(endDate/1000) })
    return this._get(req)
  }

  async returnChartData(currency: string, period: number, startDate: Date, endDate: Date) {
    if (! [300, 900, 1800, 7200, 14400, 86400].includes(period)) {
      throw(new Error('period must be one of 300, 900, 1800, 7200, 14400 or 86400'))
    }
    return this._get({
      command: 'returnChartData', currencyPair: currency,
      start: Math.floor(startDate/1000), end: Math.floor(endDate/1000),
      period: period
    })
  }

  async returnCurrencies() {
    return this._get({ command: 'returnCurrencies' })
  }

  async returnLoadOrders(currency?: string) {
    return this._get({ command: 'returnLoadOrders', currency: currency })
  }

  // Trading API Methods
  async returnBalances() {
    return this._post({ command: 'returnBalances' })
  }

  async returnCompleteBalances(all?: boolean) {
    let req : { command: string, account?: string } = { command: 'returnCompleteBalances' }
    if (all) {
      Object.assign(req, { "account": "all" })
    }
    return this._post(req)
  }

  async returnDepositAddresses() {
    return this._post({ command: 'returnDepositAddresses' })
  }

  async generateNewAddress(currency: string) {
    return this._post({ command: 'generateNewAddress', currency: currency })
  }

  async returnDepositsWithdrawals(startDate: number, endDate: number) {
    return this._post({ command: "returnDepositsWithdrawals",
      start: Math.floor(startDate/1000),
      end: Math.floor(endDate/1000)
    })
  }

  async returnOpenOrders(currencyPair: "all" | string) {
    return this._post({ command: "returnOpenOrders", currencyPair: currencyPair })
  }

  // async returnTradeHistory(currencyPair: "all" | string, startDate?: number, endDate?: number) {
  //   let req : { command: string, currencyPair?: string, start?: number, end?: number
  //     } = { command: "returnTradeHistory", currencyPair: currencyPair }
  //   if (startDate)
  //     req["start"] = Math.floor(startDate/1000)
  //   if (endDate)
  //     req["end"] = Math.floor(endDate/1000)
  //   return this._post(req)
  // }

  // Helper methods
  async _post(query?: {
    command: string,
    account?: string,
    currency?: string,
    currencyPair?: string,
    start?: number,
    end?: number
  }) {
    let that = this
    let params = query ? new URLSearchParams(query).toString() : '';
    return new Promise( (resolve, reject) => {

      let ts = new Date().getTime();
      that.invocations.push(ts);
      that.invocations = that.invocations.filter((d) => {
        return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
      })
      let nonce = (ts * 100 - 1) + that.invocations.filter((d) => ts == d).length
      if (that.invocations.length >= that.maxTrades + 1) {
        return reject(new Error(`restricting requests to Poloniex to maximum of ${that.maxTrades} per second`))
      }

      let url = new URL(TRADING_API)
      let postData = params
      let req = https.request({
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
          'Sign': crypto.createHmac('sha512', that.secret).update(postData).digest('hex')
        }
      }, (res) => {
        let rawData =''
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`Failed to load page, status code: ${res.statusCode}`))
        }
        res.on('data', chunk => rawData += chunk)
        res.on('end', () => {
          let response = JSON.parse(rawData)
          if (response.error) {
            return reject(new Error(`Poloniex failure: ${response.error}`))
          }
          return resolve(response);
        })
      })
      req.write(postData)
      req.on('error', reject)
      req.end();
    })

  }

  async _get(query?: {
    command: string,
    currencyPair?: string,
    currency?: string,
    depth?: number,
    start?: number,
    end?: number
  }) {
    let that = this;
    let url = new URL(PUBLIC_API)
    let params = query ? '?' + new URLSearchParams(query).toString() : '';
    return new Promise( (resolve, reject) => {

      let ts = new Date().getTime();
      that.invocations.push(ts);
      that.invocations = that.invocations.filter((d) => {
        return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
      })
      if (that.invocations.length >= 7) {
        return reject(new Error('restricting requests to Poloniex to maximum of 6 per second'))
      }

      let req = https.request({
        method: 'GET',
        host: url.hostname,
        path: `${url.pathname}${params}`,
        headers: {
          'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1',
        }
      }, (res) => {
        if (res.statusCode < 200 || res.statusCode > 299) {
          return reject(new Error(`Failed to load page, status code: ${res.statusCode}`))
        }
        let rawData = ''
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          let response = JSON.parse(rawData)
          if (response.error) {
            return reject(new Error(`Poloniex failure: ${response.error}`))
          }
          return resolve(response)
        });
      })
      req.on('error', reject)
      req.end()
    })
  }

}

process.on('unhandledRejection', (err) => {
  console.error(err)
  if (process.env.NODE_ENV !== 'production')
    process.exit(1)
})