/* @flow */

import https from 'https'
import Debug from 'debug'

const debug = Debug('crypto-exchange-api:api')

export class API {
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
      debug('Successful response %o', response)
    } catch (e) {
      debug('Response error %o', response)
      throw new Error(`HTTP ${response.statusCode} Returned error: ${response.data}`)
    }
    if (resObj.error) {
      debug('Response error %o', response)
      throw new Error(`HTTP ${response.statusCode} Returned error: ${resObj.error}`)
    }
    return resObj
  }

  /**
   * Execute https.request(s)
   *
   * @private
   */
  _httpsRequest (options: {}, body?: string) {
    return new Promise((resolve, reject) => {
      debug(`sending https request with body: %o and options:\n%O`, body, options)
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
