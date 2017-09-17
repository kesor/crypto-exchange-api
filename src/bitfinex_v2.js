/* @flow */

import { API } from './api'
import { URL } from 'url'
import querystring from 'querystring'

/**
 * Returns a client for the Bitfinex v2 REST API.
 */
export class BitfinexV2 extends API {
  endpoint: string
  endpointUrl: URL
  endpointHost: string
  endpointPath: string

  constructor () {
    super()
    this.endpoint = 'https://api.bitfinex.com/v2/'
    this.endpointUrl = new URL(this.endpoint)
    this.endpointHost = this.endpointUrl.hostname
    this.endpointPath = this.endpointUrl.pathname
    this.name = 'bitfinex v2'
  }

  /**
   * The ticker is a high level overview of the state of the market. It shows
   * you the current best bid and ask, as well as the last trade price. It also
   * includes information such as daily volume and how much the price has moved
   * over the last day.
   *
   * {@link https://bitfinex.readme.io/v2/reference#rest-public-tickers}
   *
   * Helper function {@link tickersJSON} annotates the result with attribute names.
   *
   * @param {Array<string>} tickers list of trading pairs and funding currencies
   * @returns {Promise<Array<Array<string|number>>}
   */
  tickers (...tickers: Array<string>) {
    return this._get('tickers', { symbols: tickers.join(',') })
  }

  /**
   * Annotate results from {@link tickers} using property names, turning the result
   * into an array of key/value pairs with information about the trading pairs and
   * funding currencies. @see tickers
   *
   * @param {Array<string>} tickers list of trading pairs and funding currencies
   * @returns Promise<{[string]:{[string]:number}}>
   */
  async tickersJSON (...tickers: string[]): Promise<{ [string]: { [string]: number } }> {
    let res = await this.tickers(...tickers)
    let json: { [string]: { [string]: number } } = {}
    for (let ticker of res) {
      json[ticker[0]] = this._jsonTorF(...ticker)
    }
    return json
  }

  /**
   * The ticker is a high level overview of the state of the market. It shows
   * you the current best bid and ask, as well as the last trade price. It also
   * includes information such as daily volume and how much the price has moved
   * over the last day.
   *
   * {@link https://bitfinex.readme.io/v2/reference#rest-public-ticker}
   *
   * Helper function {@link tickerJSON} annotates the result with attribute names.
   *
   * @param {string} ticker a single name of a trading pair or a funding currency
   * @returns {Promise<Array<number>>}
   */
  ticker (ticker: string) {
    return this._get(`ticker/${ticker}`, {})
  }

  /**
   * Annotate results from {@link ticker} using property names, turning the result
   * into an array of key/value pairs with information about the trading pair or
   * funding currency. @see ticker
   *
   * @param {string} ticker a single name of a trading pair or a funding currency
   * @returns Promise<{[string]:number}>
   */
  async tickerJSON (ticker: string) {
    let res = await this.ticker(ticker)
    let json = this._jsonTorF(ticker, ...res)
    return json
  }

  /**
   * @private
   * @param {string} name ticker name
   * @param {number[]} inline ticker properties
   */
  _jsonTorF (name: string, ...inline: number[]) {
    if (name.startsWith('f')) { // funding currency
      return this._jsonFundingCurrency(inline)
    } else if (name.startsWith('t')) { // trading pair
      return this._jsonTradingPair(inline)
    } else {
      throw new Error('Not a trading pair or funding currency')
    }
  }

  /**
   * @private
   * @param {number[]} inline funding currency properties
   */
  _jsonFundingCurrency (inline: number[]) {
    return {
      frr: inline[0],
      bid: inline[1],
      bid_period: inline[2],
      bid_size: inline[3],
      ask: inline[4],
      ask_period: inline[5],
      ask_size: inline[6],
      daily_change: inline[7],
      daily_change_perc: inline[8],
      last_price: inline[9],
      volume: inline[10],
      high: inline[11],
      low: inline[12]
    }
  }

  /**
   * @private
   * @param {number[]} inline trading pair properties
   */
  _jsonTradingPair (inline: number[]) {
    return {
      bid: inline[0],
      bid_size: inline[1],
      ask: inline[2],
      ask_size: inline[3],
      daily_change: inline[4],
      daily_change_perc: inline[5],
      last_price: inline[6],
      volume: inline[7],
      high: inline[8],
      low: inline[9]
    }
  }

  /**
   * Send a GET request to the API endpoint and return results.
   *
   * @private
   * @param {string} path api path
   * @param {{[string]:string}} query api query parameters
   */
  async _get (path: string, query: {} | { [string]: string | number | boolean }): Promise<*> {
    const options = {
      method: 'GET',
      host: this.endpointHost,
      path: this.endpointPath + path + '?' + querystring.stringify(query),
      headers: {
        'User-Agent': 'github.com/kesor/crypto-exchange-api v0.0.1'
      }
    }
    return this._resJsonParse(await this._httpsRequest(options))
  }
}
