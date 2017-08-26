/* @flow */
import https from 'https'

export class API {
  /**
   * Store and check per-second rate limits
   *
   * @private
   */
  _checkRateLimit (ts: number, limit: number, rates: Array<number>) {
    rates.push(ts)
    rates = rates.filter((d: number) => {
      return d > ts - 1000 // filter-out all the invocations happened more than 1s ago
    })
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
    } catch (e) {
      throw new Error(`HTTP ${response.statusCode} Returned error: ${response.data}`)
    }
    if (resObj.error) {
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
