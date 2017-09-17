/* @flow */

import t from 'assert'
import { describe, it, beforeEach, afterEach } from 'mocha'
import * as sinon from 'sinon'
import nock from 'nock'

import { API } from '../src/api'

const sandbox = sinon.createSandbox()

describe('API', () => {
  let api: API
  beforeEach(() => {
    api = new API()
  })
  afterEach(() => {
    sandbox.reset()
  })
  describe('constructor', () => {
    it('should set the api name', () => {
      t.equal(api.name, 'undefined')
    })
  })
  describe('#_checkRateLimit', () => {
    it('should add provided timestamp to end of provided array', () => {
      let rates = [555]
      t.ok(api._checkRateLimit(666, 10, rates))
      t.deepEqual(rates, [555, 666])
    })
    it('should return true when limit is above given rates', () => {
      let rates = [444, 555]
      t.ok(api._checkRateLimit(666, 3, rates)) // 3 calls < 1000 apart
    })
    it('should return false when limit is below given rates', () => {
      let rates = [444, 555]
      t.ok(!api._checkRateLimit(777, 2, rates))
    })
    it('should ignore items that pass above 1000 from latest addition', () => {
      let rates = [444, 555]
      t.ok(api._checkRateLimit(1445, 2, rates))
    })
    it('should change the passed rates', () => {
      let rates = [555, 666]
      api._checkRateLimit(1666, 3, rates)
    })
  })
  describe('#_resJsonParse', () => {
    it('should be tested')
  })
  describe('#_httpsRequest', () => {
    beforeEach(() => {
      nock.disableNetConnect()
    })
    afterEach(() => {
      nock.cleanAll()
    })
    it('should be tested')
    it('should use the same http agent for all requests')
    // agent = new http.Agent({ keepAlive: true })
    // http.request({ agent: agent })
  })
})
