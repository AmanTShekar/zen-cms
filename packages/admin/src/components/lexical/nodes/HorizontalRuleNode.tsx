import type {
 DOMExportOutput,
 EditorConfig,
 LexicalNode,
 NodeKey,
 SerializedElementNode,
 Spread,
} from 'lexical'
import { ParagraphNode } from 'lexical'
import type { SerializedParagraphNode } from 'lexical'
import { $applyNodeReplacement } from 'lexical'

export type SerializedHorizontalRuleNode = Spread<
 { type: 'horizontalrule'; version: 1 },
 SerializedParagraphNode
>

export class HorizontalRuleNode extends ParagraphNode {
 static getType(): string {
 return 'horizontalrule'
 }

 static clone(node: HorizontalRuleNode): HorizontalRuleNode {
 return new HorizontalRuleNode(node.__key)
 }

 static importJSON(): HorizontalRuleNode {
 return $createHorizontalRuleNode()
 }

 static importDOM(): null {
 return null
 }

 exportDOM(): DOMExportOutput {
 const element = document.createElement('hr')
 element.className = 'lexical-horizontal-rule'
 return { element }
 }

 exportJSON(): SerializedHorizontalRuleNode {
 return {
 ...super.exportJSON(),
 type: 'horizontalrule',
 version: 1 as const,
 }
 }

 createDOM(): HTMLElement {
 const hr = document.createElement('hr')
 hr.className = 'lexical-horizontal-rule'
 return hr
 }

 updateDOM(): false {
 return false
 }

 isInline(): false {
 return false
 }
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
 return $applyNodeReplacement(new HorizontalRuleNode())
}

export function $isHorizontalRuleNode(
 node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
 return node instanceof HorizontalRuleNode
}
