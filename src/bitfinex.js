/* @flow */

import { API } from './api'
import { URL } from 'url'
import crypto from 'crypto'
import querystring from 'querystring'
// import Debug from 'debug'

// const debug = Debug('crypto-exchange-api:bitfinex')

/**
 * Returns a client for the Bitfinex v1 REST API.
 */
export class Bitfinex extends API {
  endpoint: string
  endpointUrl: URL
  endpointHost: string
  endpointPath: string
  key: string | null | void
  secret: string | null | void
  tradingRate: number
  _tradingRateCount: number[]

  constructor (key?: string, secret?: string, tradingRate?: number) {
    super()
    this.endpoint = 'https://api.bitfinex.com/v1/'
    this.endpointUrl = new URL(this.endpoint)
    this.endpointHost = this.endpointUrl.hostname
    this.endpointPath = this.endpointUrl.pathname
    this.key = key || process.env.CRYPTO_BITFINEX_KEY
    this.secret = secret || process.env.CRYPTO_BITFINEX_SECRET
    this.tradingRate = tradingRate || (90 / 60) // separate for each method
    // TODO: add trade limit 1) per minute   2) separate per method
    this._tradingRateCount = []
    this.name = 'bitfinex v1'
  }

  /**
   * Return a list of symbol names.
   *
   * {@link https://docs.bitfinex.com/v1/reference#rest-public-symbols}
   *
   * @returns {Promise<string[]>} list of symbols
   */
  symbols (): Promise<string[]> {
    return this._get('symbols')
  }

  /**
   * Return information about your account
   */
  accountInfo (): Promise<{}[]> {
    return this._post('account_infos')
  }

  /**
   * Return your withdrawal fees
   */
  accountFees (): Promise<{}[]> {
    return this._post('account_fees')
  }

  /**
   * Returns a 30-day summary of your trading volume and return on margin funding.
   * @returns {Promise<{trade_vol_30d: string, funding_profit_30d: string, maker_fees: number, taker_fees: number}>}
   * * `trade_vol_30d` - Trading volumes for any currency for the last 30 days
   * * `funding_profit_30d` - Funding profits for any currency for the last 30 days
   * * `maker_fees` - Your current fees for maker orders (limit orders not marketable, in percent)
   * * `taker_fees` - Your current fees for taker orders (marketable order, in percent)
   */
  summary (): Promise<{trade_vol30d: string, funding_profit_30d: string, maker_fees: number, taker_fees: number}> {
    return this._post('summary')
  }

  /**
   * Return your balances.
   *
   * {@link https://docs.bitfinex.com/v1/reference#rest-auth-wallet-balances}
   */
  balances (): Promise<{}[]> {
    return this._post('balances')
  }

  /**
   * Send a GET request to the API endpoint and return results.
   *
   * @private
   * @param {string} path api path
   * @param {{[string]:string}} [query] api query parameters
   */
  async _get (path: string, query?: { [string]: string }) {
    let qs = query ? '?' + querystring.stringify(query) : ''
    const options = {
      method: 'GET',
      host: this.endpointHost,
      path: this.endpointPath + path + qs,
      headers: {
        'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1'
      }
    }
    return this._resJsonParse(await this._httpsRequest(options))
  }

  /**
   * Send a POST request to the API endpoint and return results.
   *
   * @private
   * @param {string} path api path
   * @param {{[string]:string}} [query] api query
   */
  async _post (path: string, query?: { [string]: string }) {
    let ts = Date.now()
    if (this.key === undefined || this.secret === undefined) {
      throw new Error('Key and secret are not available for POST requests.')
    }
    if (!await this._checkRateLimit(ts, this.tradingRate, this._tradingRateCount)) {
      throw new Error(`restricting requests to Bitfinex to maximum of ${this.tradingRate} per second`)
    }
    let nonce: number = (ts * 100 - 1) + this._tradingRateCount.filter((d: number) => ts === d).length
    let body: string = JSON.stringify({ request: this.endpointPath + path, nonce: nonce.toString() }) // querystring.stringify(Object.assign({}, { nonce: nonce }, query))
    let payload: string = Buffer.from(body).toString('base64')
    const options = {
      method: 'POST',
      host: this.endpointHost,
      path: this.endpointPath + path,
      headers: {
        'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'X-Bfx-ApiKey': this.key,
        'X-Bfx-Payload': payload,
        'X-Bfx-Signature': crypto.createHmac('sha384', this.secret || '').update(payload).digest('hex')
      }
    }
    return this._resJsonParse(await this._httpsRequest(options, body))
  }
}
