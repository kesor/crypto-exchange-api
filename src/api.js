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

  /**
   * Parse https.request responses
   *
   * @private
   */
  _resJsonParse (response: { statusCode: number, data: string }) {
    let resObj
    try {
      resObj = JSON.parse(response.data)
      debug('(%s) Successful response %o', this.name, response)
    } catch (e) {
      debug('(%s) Response error %o', this.name, response)
      throw new Error(`(${this.name}) HTTP ${response.statusCode} Returned error: ${response.data}`)
    }
    if (resObj.error) {
      debug('(%s) Response error %o', this.name, response)
      throw new Error(`(${this.name}) HTTP ${response.statusCode} Returned error: ${resObj.error}`)
    }
    return resObj
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
