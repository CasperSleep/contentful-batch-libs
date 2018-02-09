import {createEntities, createEntries} from '../../lib/push/creation'

import { logEmitter } from '../../lib/utils/logging'
import getEntityName from '../../lib/utils/get-entity-name'

jest.setTimeout(10000)

jest.mock('../../lib/utils/logging', () => ({
  logEmitter: {
    emit: jest.fn()
  }
}))

afterEach(() => {
  logEmitter.emit.mockClear()
})

test('Create entities', () => {
  const updateStub = jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Asset'}}))
  const space = {
    createAssetWithId: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Asset'}}))
  }
  return createEntities({space: space, type: 'Asset'}, [
    { original: { sys: {} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {} }, transformed: { sys: {id: '456'} } }
  ], [
    {sys: {id: '123', version: 6}, update: updateStub}
  ])
    .then((response) => {
      expect(space.createAssetWithId.mock.calls).toHaveLength(1)
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(2)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Create entities handle regular errors', () => {
  const updateStub = jest.fn()
  const space = {
    createEntryWithId: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}}))
  }
  const creationError = new Error('could not create entity')
  updateStub.mockImplementationOnce(() => Promise.reject(creationError))

  const entries = [{
    original: { sys: {contentType: {sys: {id: 'ctid'}}} },
    transformed: { sys: {id: '123'}, fields: {gonefield: '', existingfield: ''} }
  }]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]

  return createEntities({space: space, type: 'Asset'}, entries, destinationEntries)
    .then((result) => {
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(1)
      const warningCount = logEmitter.emit.mock.calls.filter((args) => args[0] === 'warning').length
      const errorCount = logEmitter.emit.mock.calls.filter((args) => args[0] === 'error').length
      expect(warningCount).toBe(0)
      expect(errorCount).toBe(1)
      expect(logEmitter.emit.mock.calls[0][0]).toBe('error')
      expect(logEmitter.emit.mock.calls[0][1]).toBe(creationError)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(null)
    })
})

test('Create entries', () => {
  const updateStub = jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}}))
  const space = {
    createEntryWithId: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}})),
    createEntry: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}}))
  }
  const entries = [
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '456'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {} } }
  ]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]
  return createEntries({space: space, skipContentModel: false}, entries, destinationEntries)
    .then((response) => {
      expect(space.createEntryWithId.mock.calls).toHaveLength(1)
      expect(space.createEntry.mock.calls).toHaveLength(1)
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(3)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Create entries and remove unknown fields', () => {
  const updateStub = jest.fn()
  const errorUnkownField = new Error()
  errorUnkownField.name = 'UnknownField'
  errorUnkownField.error = {
    details: {
      errors: [{
        name: 'unknown',
        path: ['fields', 'gonefield']
      }]
    }
  }
  updateStub.mockImplementationOnce(() => Promise.reject(errorUnkownField))
  updateStub.mockImplementationOnce(() => Promise.resolve({
    sys: {type: 'Entry', id: '123'},
    fields: {}
  }))

  const entries = [{
    original: { sys: {contentType: {sys: {id: 'ctid'}}} },
    transformed: { sys: {id: '123'}, fields: {gonefield: '', existingfield: ''} }
  }]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]

  return createEntries({space: {}, skipContentModel: true}, entries, destinationEntries)
    .then((response) => {
      expect(updateStub.mock.calls).toHaveLength(2)
      expect('existingfield' in entries[0].transformed.fields).toBeTruthy()
      expect('gonefield' in entries[0].transformed.fields).toBeFalsy()
      expect(logEmitter.emit.mock.calls).toHaveLength(1)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Create entries and handle regular errors', () => {
  const updateStub = jest.fn()
  const creationError = new Error('Some creation error')
  updateStub.mockImplementationOnce(() => Promise.reject(creationError))

  const entries = [{
    original: { sys: {contentType: {sys: {id: 'ctid'}}} },
    transformed: { sys: {id: '123'}, fields: {gonefield: '', existingfield: ''} }
  }]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]

  return createEntries({space: {}}, entries, destinationEntries)
    .then((result) => {
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(1)
      const warningCount = logEmitter.emit.mock.calls.filter((args) => args[0] === 'warning').length
      const errorCount = logEmitter.emit.mock.calls.filter((args) => args[0] === 'error').length
      expect(warningCount).toBe(0)
      expect(errorCount).toBe(1)
      expect(logEmitter.emit.mock.calls[0][0]).toBe('error')
      expect(logEmitter.emit.mock.calls[0][1]).toBe(creationError)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(null)
    })
})

test('Fails to create locale if it already exists', () => {
  const space = {
    createLocale: jest.fn(() => Promise.reject(errorValidationFailed))
  }
  const errorValidationFailed = new Error()
  errorValidationFailed.error = {
    sys: {id: 'ValidationFailed'},
    details: {
      errors: [{name: 'taken'}]
    }
  }
  const entity = { original: { sys: {} }, transformed: { sys: {} } }

  return createEntities({space: space, type: 'Locale'}, [entity], [{sys: {}}])
    .then((entities) => {
      expect(entities[0]).toBe(entity)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

const FastRateLimit = require('fast-ratelimit').FastRateLimit

const messageLimiter = new FastRateLimit({
  threshold: 78,
  ttl: 1
})

let limitErrorCnt = 0

function rateLimitedRequest (entity) {
  return messageLimiter.consume('testRateLimit')
    .then(() => {
      return entity
    })
    .catch(() => {
      const rateLimitError = new Error('429 - To many requests' + limitErrorCnt)
      rateLimitError.status = 429
      rateLimitError.headers = {
        'x-contentful-ratelimit-reset': 1
      }
      limitErrorCnt++
      throw rateLimitError
    })
}

test.only('Create many entities and handle rate limit', () => {
  const updateStub = jest.fn(rateLimitedRequest)
  const space = {
    createAssetWithId: jest.fn((id, entity) => rateLimitedRequest({
      sys: { id, type: 'Asset' },
      ...entity,
      created: true
    }))
  }
  const ENTITY_COUNT = 500
  const sourceEntities = Array.from(Array(ENTITY_COUNT).keys())
    .map((i) => ({
      original: { sys: { id: `${i}` }, original: true },
      transformed: { sys: { id: `${i}` }, transformed: true }
    }))
  const destinationEntities = Array.from(Array(ENTITY_COUNT / 2).keys())
    .map((i) => ({
      sys: { id: `${i * 2}` },
      destination: true,
      update: () => {
        return updateStub({
          sys: { id: `${i * 2}`, type: 'Asset' },
          updated: true
        })
      }
    }))

  return createEntities(
    { space: space, type: 'Asset' },
    sourceEntities,
    destinationEntities
  )
    .then((response) => {
      console.log({limitErrorCnt})
      expect(response).toHaveLength(ENTITY_COUNT)
      expect(logEmitter.emit.mock.calls).toHaveLength(ENTITY_COUNT)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})
