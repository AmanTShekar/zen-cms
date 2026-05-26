import { getCompiledZodSchema } from './packages/core/src/schema/engine'
import { LandingPage } from './config/globals/landing-page'

const schema = getCompiledZodSchema(LandingPage.fields, LandingPage)

const payload1 = {
  title: 'Test',
  heroDescription: 'asdf',
  sections: [
    { blockType: 'hero', headline: 'Hello' }
  ]
}

const payload2 = {
  title: 'Test',
  heroDescription: 'asdf',
  sections: [
    { blockType: 'hero', content: { headline: 'Hello' } }
  ]
}

const payload3 = {
  title: 'Test',
  heroDescription: 'asdf',
  sections: [
    { blockType: 'hero', id: 'block_1', content: { headline: 'Hello' } }
  ]
}

console.log('Payload 1 (Flat):')
let result = schema.partial().safeParse(payload1)
if (!result.success) {
  console.log(JSON.stringify(result.error.flatten(), null, 2))
} else {
  console.log('Validation success!', result.data)
}

console.log('\nPayload 2 (Nested):')
result = schema.partial().safeParse(payload2)
if (!result.success) {
  console.log(JSON.stringify(result.error.flatten(), null, 2))
} else {
  console.log('Validation success!', result.data)
}

console.log('\nPayload 3 (Nested with id):')
result = schema.partial().safeParse(payload3)
if (!result.success) {
  console.log(JSON.stringify(result.error.flatten(), null, 2))
} else {
  console.log('Validation success!', result.data)
}
