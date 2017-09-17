/* @flow */

import t from 'assert'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon'

import { BitfinexV2 } from '../src/bitfinex_v2'

process.on('unhandledRejection', (err) => {
  console.error(err) // eslint-disable-line no-console
  process.exit(1)
})

const sandbox = sinon.createSandbox()

describe('BitfinexV2 API', () => {
  describe('constructor', () => {
    it('should set the api name', () => {
      t.equal(new BitfinexV2().name, 'bitfinex v2')
    })
    it('should define the API endpoint', () => {
      t.equal(new BitfinexV2().endpoint, 'https://api.bitfinex.com/v2/')
    })
  })
  describe('public api', () => {
    let bfx, fakeGet
    beforeEach(() => {
      bfx = new BitfinexV2()
      fakeGet = sandbox.stub(bfx, '_get')
    })
    afterEach(() => {
      t.ok(fakeGet.calledOnce)
      sandbox.reset()
    })
    it('should implement /tickers', async () => {
      let res = [['fUSD', 0.00084679, 0.00073, 30, 39587.73068079, 0.00077181, 2, 4803382.13433891, 0.0000918, 0.1522, 0.0006948, 79406619.25851107, 0, 0]]
      fakeGet.returns(res)
      t.deepEqual(await bfx.tickers('fUSD'), res)
      t.ok(fakeGet.calledWith('tickers', { symbols: 'fUSD' }))
    })
    it('should implement /tickers json parsing', async () => {
      let res = [
        ['fUSD', 0.00084679, 0.00073, 30, 39587.73068079, 0.0007967, 2, 5005375.15195307, -0.00003324, -0.0401, 0.0007967, 78546356.045701, 0, 0],
        ['tBTCUSD', 4346.3, 16.7770791, 4346.4, 12.74414776, -32.2, -0.0074, 4346.3, 26592.11456399, 4464.2, 4250]
      ]
      let expected = {
        'fUSD': {
          frr: res[0][1],
          bid: res[0][2],
          bid_period: res[0][3],
          bid_size: res[0][4],
          ask: res[0][5],
          ask_period: res[0][6],
          ask_size: res[0][7],
          daily_change: res[0][8],
          daily_change_perc: res[0][9],
          last_price: res[0][10],
          volume: res[0][11],
          high: res[0][12],
          low: res[0][13]
        },
        'tBTCUSD': {
          bid: res[1][1],
          bid_size: res[1][2],
          ask: res[1][3],
          ask_size: res[1][4],
          daily_change: res[1][5],
          daily_change_perc: res[1][6],
          last_price: res[1][7],
          volume: res[1][8],
          high: res[1][9],
          low: res[1][10]
        }
      }
      fakeGet.returns(res)
      let actual = await bfx.tickersJSON('fUSD', 'tBTCUSD')
      t.deepEqual(actual, expected)
    })
    it('should implement /ticker', async () => {
      let res = [0.00084679, 0.00073, 30, 39587.73068079, 0.00077181, 2, 4803382.13433891, 0.0000918, 0.1522, 0.0006948, 79406619.25851107, 0, 0]
      fakeGet.returns(res)
      t.deepEqual(await bfx.ticker('fUSD'), res)
      t.ok(fakeGet.calledWith('ticker/fUSD'))
    })
    it('should implement /ticker json parsing', async () => {
      let res = [4346.3, 16.7770791, 4346.4, 12.74414776, -32.2, -0.0074, 4346.3, 26592.11456399, 4464.2, 4250]
      let expected = {
        bid: res[0],
        bid_size: res[1],
        ask: res[2],
        ask_size: res[3],
        daily_change: res[4],
        daily_change_perc: res[5],
        last_price: res[6],
        volume: res[7],
        high: res[8],
        low: res[9]
      }
      fakeGet.returns(res)
      let actual = await bfx.tickerJSON('tBTCUSD')
      t.deepEqual(actual, expected)
    })
  })
})
