/* @flow */

/**
 * https://bittrex.com/home/api
 */

import { API } from './api'

export class Bittrex extends API {
  key: ?string
  secret: ?string

  constructor (key?: string, secret?: string) {
    super()
    this.name = 'bittrex'
    this.key = key || process.env.CRYPTO_BITTREX_KEY
    this.secret = secret || process.env.CRYPTO_BITTREX_SECRET
  }
}
