/* @flow */
import { API } from './api'
import { URL } from 'url'
import querystring from 'querystring'

/**
 * Returns a client for the Bitfinex REST API.
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
  async tickersJSON (...tickers: Array<string>): Promise<{ [string]: { [string]: number } }> {
    let res = await this.tickers(...tickers)
    let json: { [string]: { [string]: number } } = {}
    for (let ticker of res) {
      if (ticker[0].startsWith('f')) { // funding currency
        json[ticker[0]] = {
          frr: ticker[1],
          bid: ticker[2],
          bid_period: ticker[3],
          bid_size: ticker[4],
          ask: ticker[5],
          ask_period: ticker[6],
          ask_size: ticker[7],
          daily_change: ticker[8],
          daily_change_perc: ticker[9],
          last_price: ticker[10],
          volume: ticker[11],
          high: ticker[12],
          low: ticker[13]
        }
      } else if (ticker[0].startsWith('t')) { // trading pair
        json[ticker[0]] = {
          bid: ticker[1],
          bid_size: ticker[2],
          ask: ticker[3],
          ask_size: ticker[4],
          daily_change: ticker[5],
          daily_change_perc: ticker[6],
          last_price: ticker[7],
          volume: ticker[8],
          high: ticker[9],
          low: ticker[10]
        }
      } else {
        throw new Error('Not a trading pair or funding currency')
      }
    }
    return json
  }

  async _get (path: string, query: {} | { [string]: string }) {
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
