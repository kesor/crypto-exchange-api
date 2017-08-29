/* @flow */

import { API } from './api'
import { URL } from 'url'
import querystring from 'querystring'

/**
 * Returns a client for the Bitfinex v1 REST API.
 */
export class Bitfinex extends API {
  endpoint: string
  endpointUrl: URL
  endpointHost: string
  endpointPath: string

  constructor () {
    super()
    this.endpoint = 'https://api.bitfinex.com/v1/'
    this.endpointUrl = new URL(this.endpoint)
    this.endpointHost = this.endpointUrl.hostname
    this.endpointPath = this.endpointUrl.pathname
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
}
