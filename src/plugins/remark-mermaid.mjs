import { visit } from 'unist-util-visit';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === undefined || node.lang !== 'mermaid') {
        return;
      }

      const rawCode = node.value.trim();
      const encodedCode = encodeURIComponent(rawCode);
      const escapedCode = escapeHtml(rawCode);

      const firstLine = rawCode.split('\n')[0]?.trim() || 'diagram';
      let diagramType = 'Diagram';
      if (firstLine.startsWith('sequenceDiagram')) diagramType = 'Sequence diagram';
      else if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) diagramType = 'Flowchart';
      else if (firstLine.startsWith('stateDiagram')) diagramType = 'State diagram';
      else if (firstLine.startsWith('classDiagram')) diagramType = 'Class diagram';
      else if (firstLine.startsWith('erDiagram')) diagramType = 'ER diagram';

      parent.children[index] = {
        type: 'html',
        value: `
<div class="mermaid-wrapper not-prose my-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 overflow-hidden" data-mermaid-code="${encodedCode}">
  <div class="mermaid-toolbar flex items-center justify-between px-3.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)]">
    <span class="font-medium text-[var(--text-secondary)]">${escapeHtml(diagramType)}</span>
    <div class="flex items-center gap-1" role="toolbar" aria-label="Diagram controls">
      <button type="button" class="mermaid-btn" data-mermaid-action="zoom-out" title="Zoom out" aria-label="Zoom out">−</button>
      <span class="mermaid-zoom-label px-1.5 font-mono text-[11px] text-[var(--text-muted)] select-none" data-mermaid-zoom-level>100%</span>
      <button type="button" class="mermaid-btn" data-mermaid-action="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
      <button type="button" class="mermaid-btn" data-mermaid-action="reset" title="Reset zoom" aria-label="Reset zoom">Reset</button>
      <button type="button" class="mermaid-btn mermaid-btn-expand" data-mermaid-action="expand" title="Expand fullscreen" aria-label="Expand fullscreen">Expand</button>
    </div>
  </div>
  <div class="mermaid-stage relative overflow-auto p-6 flex justify-center items-center min-h-[180px] bg-[var(--bg-canvas)]" data-mermaid-stage>
    <div class="mermaid-PanZoom transition-transform duration-150 origin-center" data-mermaid-canvas>
      <pre class="mermaid">${escapedCode}</pre>
    </div>
  </div>
</div>`.trim(),
      };
    });
  };
}
export default remarkMermaid;
