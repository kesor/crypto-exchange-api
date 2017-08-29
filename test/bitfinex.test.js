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
  it('should define the API endpoint', () => {
    t.equal(new Bitfinex().endpoint, 'https://api.bitfinex.com/v1/')
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
})
