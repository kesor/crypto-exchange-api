/* @flow */

import https from 'https'
import { URLSearchParams } from 'url'

export const PUBLIC_API = 'https://poloniex.com/public'
export const PRIVATE_API = 'https://poloniex.com/tradingApi'

export class Poloniex {
  invocations: Array<number>

  constructor() {
    this.invocations = []
  }

  async returnTicker() {
    return this._get({command: 'returnTicker'})
  }

  async return24Volume() {
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

  async _get(query?: {
    command: string,
    currencyPair?: string,
    currency?: string,
    depth?: number,
    start?: number,
    end?: number
  }) {
    let that = this;
    let params = query ? '?' + new URLSearchParams(query).toString() : '';
    return new Promise( (resolve, reject) => {

      let ts = new Date().getTime();
      that.invocations.push(ts);
      that.invocations = that.invocations.filter((d) => {
        return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
      })
      if (this.invocations.length > 6) {
        reject(new Error('restricting requests to Poloniex to maximum of 6 per second'))
      }

      https.get(`${PUBLIC_API}${params}`, (res) => {
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
      }).on('error', reject)
    })
  }

}

process.on('unhandledRejection', (err) => {
  console.error(err)
  if (process.env.NODE_ENV !== 'production')
    process.exit(1)
})