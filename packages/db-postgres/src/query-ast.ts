/**
 * Zenith CMS — Query AST Parser
 * ─────────────────────────────
 * Translates incoming URL query objects or Mongo-style queries into a structured
 * Abstract Syntax Tree (AST) that can be reliably executed by both MongoDB and PostgreSQL adapters.
 */

export type Operator = 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte'

export interface QueryNode {
  type: 'field' | 'logical'
}

export interface FieldNode extends QueryNode {
  type: 'field'
  field: string
  operator: Operator
  value: any
}

export interface LogicalNode extends QueryNode {
  type: 'logical'
  operator: 'and' | 'or'
  children: QueryNode[]
}

export class QueryASTParser {
  /**
   * Parses a raw query object (e.g., from req.query or a Mongo-style filter) into an AST.
   */
  static parse(rawQuery: any): QueryNode {
    // Basic implementation: convert flat key-value pairs to 'field' nodes combined by 'and'
    const children: QueryNode[] = []

    for (const key of Object.keys(rawQuery)) {
      const value = rawQuery[key]

      // Handle $or and $and logical operators
      if ((key === '$or' || key === '$and') && Array.isArray(value)) {
        const logicalOp = key === '$or' ? 'or' : 'and'
        const logicalChildren: QueryNode[] = []
        for (const clause of value) {
          if (typeof clause === 'object' && clause !== null) {
            const parsed = this.parse(clause)
            if (parsed) logicalChildren.push(parsed)
          }
        }
        if (logicalChildren.length > 0) {
          children.push({
            type: 'logical',
            operator: logicalOp,
            children: logicalChildren,
          } as LogicalNode)
        }
        continue
      }

      // Handle simple key=value as 'equals'
      if (typeof value !== 'object' || value === null) {
        children.push({
          type: 'field',
          field: key,
          operator: 'equals',
          value
        } as FieldNode)
      } else {
        // Handle complex objects like { price: { gt: 10 } }
        const ops = Object.keys(value)
        for (const op of ops) {
          if (op === '$options') continue
          const parsedOp = this.mapOperator(op)
          children.push({
            type: 'field',
            field: key,
            operator: parsedOp,
            value: value[op]
          } as FieldNode)
        }
      }
    }

    if (children.length === 1) {
      return children[0]
    }

    return {
      type: 'logical',
      operator: 'and',
      children
    } as LogicalNode
  }

  private static mapOperator(op: string): Operator {
    const map: Record<string, Operator> = {
      'eq': 'equals',
      'ne': 'not_equals',
      'contains': 'contains',
      'in': 'in',
      'nin': 'not_in',
      'gt': 'gt',
      'gte': 'gte',
      'lt': 'lt',
      'lte': 'lte',
      '$eq': 'equals',
      '$ne': 'not_equals',
      '$gt': 'gt', // Support Mongo style
      '$gte': 'gte',
      '$lt': 'lt',
      '$lte': 'lte',
      '$in': 'in',
      '$nin': 'not_in',
      '$regex': 'contains',
    }

    return map[op] || 'equals'
  }
}
