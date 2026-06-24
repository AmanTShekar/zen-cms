import { ForbiddenError } from '../errors'

export class RLSService {
  static applyReadAccess(query: Record<string, any>, configAccess: Record<string, any>, user: Record<string, any>): boolean {
    if (user && typeof configAccess?.read === 'function') {
      const access = configAccess.read(user)
      if (access === false) return false
      if (typeof access === 'object') {
        Object.assign(query, access)
      }
    }
    return true
  }

  static applyUpdateAccess(query: Record<string, any>, configAccess: Record<string, any>, user: Record<string, any>, req?: import('express').Request): void {
    if (user && typeof configAccess?.update === 'function') {
      const access = configAccess.update(user, { req })
      if (access === false) throw new ForbiddenError()
      if (typeof access === 'object' && access !== null) {
        Object.assign(query, access)
      }
    }
  }

  static applyDeleteAccess(query: Record<string, any>, configAccess: Record<string, any>, user: Record<string, any>, req?: import('express').Request): void {
    if (user && typeof configAccess?.delete === 'function') {
      const access = configAccess.delete(user, { req })
      if (access === false) throw new ForbiddenError()
      if (typeof access === 'object' && access !== null) {
        Object.assign(query, access)
      }
    }
  }
}
