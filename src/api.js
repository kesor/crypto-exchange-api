/* @flow */

import https from 'https'
import Debug from 'debug'

const debug = Debug('crypto-exchange-api:api')

export class API {
  name: string

  constructor () {
    this.name = 'undefined'
  }

  /**
   * Store and check per-second rate limits
   *
   * @private
   */
  _checkRateLimit (ts: number, limit: number, rates: number[]) {
    rates.push(ts)
    let edge = rates.find((d) => ts - 1000 < d)
    if (edge) rates.splice(0, rates.indexOf(edge))
    return rates.length <= limit
  }

  // eslint-disable-next-line complexity
  _resErrorMessage (response: { statusCode: number, data: string }): string {
    let data
    try {
      data = JSON.parse(response.data)
    } catch (e) {
      data = { error: response.data }
    }
    if (response.statusCode > 299 || data.hasOwnProperty('error')) {
      throw new Error(data.error || data.message || response.data)
    }
    return data
  }

  /**
   * Parse https.request responses
   *
   * @private
   */
  _resJsonParse (response: { statusCode: number, data: string }) {
    try {
      debug('(%s) Successful response %o', this.name, response)
      return this._resErrorMessage(response) // throw error, will be catched and re-thrown
    } catch (e) {
      debug('(%s) Response error %o', this.name, response)
      throw new Error(`(${this.name}) HTTP ${response.statusCode} Returned error: ${e.message}`)
    }
  }

  /**
   * Execute https.request(s)
   *
   * @private
   */
  _httpsRequest (options: {}, body?: string): Promise<*> {
    return new Promise((resolve, reject) => {
      debug('(%s) sending https request with body: %o and options:\n%O', this.name, body, options)
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
}
