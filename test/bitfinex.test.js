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
  describe('#_get', () => {
    it('should be tested')
  })
  describe('#_post', () => {
    it('should be tested')
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
    it('should implement ticker')
    it('should implement stats')
    it('should implement fundingbook')
    it('should implement orderbook')
    it('should implement trades')
    it('should implement lends')
    it('should implement symbols', async () => {
      let res = ['btcusd', 'ltcusd', 'ltcbtc', 'ethusd', 'ethbtc', 'etcbtc', 'etcusd', 'rrtusd', 'rrtbtc', 'zecusd', 'zecbtc', 'xmrusd', 'xmrbtc', 'dshusd', 'dshbtc', 'bccbtc', 'bcubtc', 'bccusd', 'bcuusd', 'xrpusd', 'xrpbtc', 'iotusd', 'iotbtc', 'ioteth', 'eosusd', 'eosbtc', 'eoseth', 'sanusd', 'sanbtc', 'saneth', 'omgusd', 'omgbtc', 'omgeth', 'bchusd', 'bchbtc', 'bcheth']
      fakeGet.returns(res)
      t.deepEqual(await bfx.symbols(), res)
      t.ok(fakeGet.calledWithExactly('symbols'))
    })
    it('should implement symbol details')
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
    it('should implement account info')
    it('should implement account fees')
    it('should implement summary')
    it('should implement deposit')
    it('should implement key permissions')
    it('should implement margin information')
    it('should implement wallet balances', async () => {
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
    it('should implement transfer between wallets')
    it('should implement withdrawal')
    describe('orders', () => {
      it('should implement new order')
      it('should implement multiple new orders')
      it('should implement cancel order')
      it('should implement cancel multiple orders')
      it('should implement cancel all orders')
      it('should implement replace order')
      it('should implement order status')
      it('should implement active orders')
      it('should implement orders history')
    })
    describe('positions', () => {
      it('should implement active positions')
      it('should implement claim position')
    })
    describe('historical data', () => {
      it('should implement balance history')
      it('should implement deposit-withdrawal history')
      it('should implement past trades')
    })
    describe('margin funding', () => {
      it('should implement new offer')
      it('should implement cancel offer')
      it('should implement offer status')
      it('should implement active credits')
      it('should implement offers')
      it('should implement offers history')
      it('should implement past funding trades')
      it('should implement active funding used in a margin position')
      it('should implement active funding not used in a margin position')
      it('should implement total taken funds')
      it('should implement total taken funds')
      it('should implement close margin funding')
      it('should implement basket manage')
    })
  })
})
