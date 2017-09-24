/* @flow */

import t from 'assert'
import { describe, it } from 'mocha'

import { Bittrex } from '../src/bittrex'

describe('Bittrex', () => {
  describe('constructor', () => {
    it('should set thje api name', () => {
      t.equal(new Bittrex().name, 'bittrex')
    })
    it('should set key and secret from arguments', () => {
      let btrx = new Bittrex('key', 'secret')
      t.equal(btrx.key, 'key')
      t.equal(btrx.secret, 'secret')
    })
    it('should set key and secret from process environment when not supplied via arguments', () => {
      process.env.CRYPTO_BITTREX_KEY = 'env key'
      process.env.CRYPTO_BITTREX_SECRET = 'env secret'
      let btrx = new Bittrex()
      t.equal(btrx.key, 'env key')
      t.equal(btrx.secret, 'env secret')
      delete process.env.CRYPTO_BITTREX_KEY
      delete process.env.CRYPTO_BITTREX_SECRET
    })
  })
})
