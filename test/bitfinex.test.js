/* @flow */

import t from 'assert'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon'

import { Bitfinex } from '../src/bitfinex'

process.on('unhandledRejection', (err) => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})

const sandbox = sinon.createSandbox()

describe('Bitfinex API', () => {
  describe('constructor', () => {
    it('should define the API endpoint', () => {
      t.equal(new Bitfinex().endpoint, 'https://api.bitfinex.com/v1/')
    })
    it('should set key and secret from arguments', () => {
      let bfx = new Bitfinex('key', 'secret')
      t.equal(bfx.key, 'key')
      t.equal(bfx.secret, 'secret')
    })
    it('should set key and secret from process environment when not supplied via arguments', () => {
      process.env.CRYPTO_BITFINEX_KEY = 'env key'
      process.env.CRYPTO_BITFINEX_SECRET = 'env secret'
      let bfx = new Bitfinex()
      t.equal(bfx.key, 'env key')
      t.equal(bfx.secret, 'env secret')
      delete process.env.CRYPTO_BITFINEX_KEY
      delete process.env.CRYPTO_BITFINEX_SECRET
    })
  })
  describe('public api', () => {
    let bfx, fakeGet
    beforeEach(() => {
      bfx = new Bitfinex()
      fakeGet = sandbox.stub(bfx, '_get')
    })
    afterEach(() => {
      t.ok(fakeGet.calledOnce)
      sandbox.reset()
    })
    it('should implement /symbols', async () => {
      let res = ['btcusd', 'ltcusd', 'ltcbtc', 'ethusd', 'ethbtc', 'etcbtc', 'etcusd', 'rrtusd', 'rrtbtc', 'zecusd', 'zecbtc', 'xmrusd', 'xmrbtc', 'dshusd', 'dshbtc', 'bccbtc', 'bcubtc', 'bccusd', 'bcuusd', 'xrpusd', 'xrpbtc', 'iotusd', 'iotbtc', 'ioteth', 'eosusd', 'eosbtc', 'eoseth', 'sanusd', 'sanbtc', 'saneth', 'omgusd', 'omgbtc', 'omgeth', 'bchusd', 'bchbtc', 'bcheth']
      fakeGet.returns(res)
      t.deepEqual(await bfx.symbols(), res)
      t.ok(fakeGet.calledWithExactly('symbols'))
    })
  })
  describe('private api', () => {
    let bfx, fakePost
    beforeEach(() => {
      bfx = new Bitfinex()
      fakePost = sandbox.stub(bfx, '_post')
    })
    afterEach(() => {
      t.ok(fakePost.calledOnce)
      sandbox.reset()
    })
    it('should implement balances', async () => {
      let res = [{ 'type': 'deposit', 'currency': 'btc', 'amount': '0.0', 'available': '0.0'
      }, { 'type': 'deposit', 'currency': 'usd', 'amount': '1.0', 'available': '1.0'
      }, { 'type': 'exchange', 'currency': 'btc', 'amount': '1', 'available': '1'
      }, { 'type': 'exchange', 'currency': 'usd', 'amount': '1', 'available': '1'
      }, { 'type': 'trading', 'currency': 'btc', 'amount': '1', 'available': '1'
      }, { 'type': 'trading', 'currency': 'usd', 'amount': '1', 'available': '1'
      }]
      fakePost.returns(res)
      t.deepEqual(res, await bfx.balances())
      sinon.assert.calledWithExactly(fakePost, 'balances')
    })
  })
})
