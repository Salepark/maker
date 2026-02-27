import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/language-provider";
import { mindMapTree, documents, type MindMapNode, type MindMapDoc } from "@/data/maker-docs";
import { internalTreeNodes, internalDocuments } from "@/data/maker-docs-internal";
import { ChevronDown, ChevronRight, FileText, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function InlineDocContent({
  doc,
  lang,
  isInternal,
  color,
}: {
  doc: MindMapDoc;
  lang: string;
  isInternal: boolean;
  color: string;
}) {
  const content = lang === "ko" ? doc.contentKo : doc.contentEn;

  return (
    <div
      className="mt-2 mb-3 ml-1 pl-4 border-l-2 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ borderColor: color + "40" }}
      data-testid={`doc-content-${doc.id}`}
    >
      {isInternal && (
        <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium w-fit">
          <Lock className="h-3 w-3" />
          {lang === "ko" ? "내부 전략 문서" : "Internal Strategy Document"}
        </div>
      )}
      {content.map((paragraph, i) => (
        <p key={i} className="text-muted-foreground leading-relaxed mb-2.5 text-xs" data-testid={`text-paragraph-${doc.id}-${i}`}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function MindMapBranch({
  node,
  depth,
  lang,
  openDocId,
  onDocToggle,
  expandedNodes,
  toggleNode,
  allDocs,
  internalDocIds,
}: {
  node: MindMapNode;
  depth: number;
  lang: string;
  openDocId: string | null;
  onDocToggle: (docId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  allDocs: Record<string, MindMapDoc>;
  internalDocIds: Set<string>;
}) {
  const label = lang === "ko" ? node.labelKo : node.labelEn;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isLeaf = !hasChildren;

  if (isLeaf && node.docId) {
    const isOpen = openDocId === node.docId;
    const doc = allDocs[node.docId];

    return (
      <div>
        <Badge
          variant="outline"
          className={`cursor-pointer hover:bg-accent transition-colors text-xs py-1.5 px-3 whitespace-normal text-left leading-tight border-2 ${isOpen ? "bg-accent" : ""}`}
          style={{ borderColor: node.color + (isOpen ? "90" : "60"), color: node.color }}
          onClick={() => onDocToggle(node.docId!)}
          data-testid={`badge-doc-${node.id}`}
        >
          {isOpen
            ? <ChevronDown className="h-3 w-3 mr-1.5 shrink-0" style={{ color: node.color }} />
            : <FileText className="h-3 w-3 mr-1.5 shrink-0" style={{ color: node.color }} />
          }
          {label}
        </Badge>
        {isOpen && doc && (
          <InlineDocContent
            doc={doc}
            lang={lang}
            isInternal={internalDocIds.has(node.docId)}
            color={node.color}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full" data-testid={`branch-${node.id}`}>
      <button
        className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors group"
        onClick={() => toggleNode(node.id)}
        data-testid={`toggle-${node.id}`}
      >
        {hasChildren && (
          isExpanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className="font-semibold text-sm"
          style={{ color: node.color }}
        >
          {label}
        </span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto">
            {node.children!.length}
          </span>
        )}
      </button>
      {isExpanded && hasChildren && (
        <div className="ml-4 pl-4 border-l-2 space-y-1 mt-1 mb-2" style={{ borderColor: node.color + "30" }}>
          {node.children!.map((child) => (
            <div key={child.id} className={child.children && child.children.length > 0 ? "" : "py-0.5"}>
              <MindMapBranch
                node={child}
                depth={depth + 1}
                lang={lang}
                openDocId={openDocId}
                onDocToggle={onDocToggle}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                allDocs={allDocs}
                internalDocIds={internalDocIds}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  node,
  lang,
  openDocId,
  onDocToggle,
  expandedNodes,
  toggleNode,
  allDocs,
  internalDocIds,
}: {
  node: MindMapNode;
  lang: string;
  openDocId: string | null;
  onDocToggle: (docId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  allDocs: Record<string, MindMapDoc>;
  internalDocIds: Set<string>;
}) {
  const label = lang === "ko" ? node.labelKo : node.labelEn;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-md"
      style={{ borderTop: `3px solid ${node.color}` }}
      data-testid={`card-${node.id}`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => toggleNode(node.id)}
          data-testid={`toggle-card-${node.id}`}
        >
          {isExpanded
            ? <ChevronDown className="h-4 w-4 shrink-0" style={{ color: node.color }} />
            : <ChevronRight className="h-4 w-4 shrink-0" style={{ color: node.color }} />
          }
          <CardTitle className="text-base" style={{ color: node.color }}>
            {label}
          </CardTitle>
        </button>
      </CardHeader>
      {isExpanded && node.children && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="space-y-1">
            {node.children.map((child) => (
              <MindMapBranch
                key={child.id}
                node={child}
                depth={1}
                lang={lang}
                openDocId={openDocId}
                onDocToggle={onDocToggle}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                allDocs={allDocs}
                internalDocIds={internalDocIds}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function MakerIntro() {
  const { language } = useLanguage();
  const lang = language;
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["identity", "philosophy", "features", "demo", "research"])
  );

  const isDevMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("dev") === "1";
  }, []);

  const activeTree = useMemo<MindMapNode>(() => {
    if (!isDevMode) return mindMapTree;
    return {
      ...mindMapTree,
      children: [...(mindMapTree.children || []), ...internalTreeNodes],
    };
  }, [isDevMode]);

  const allDocs = useMemo(() => {
    if (!isDevMode) return documents;
    return { ...documents, ...internalDocuments };
  }, [isDevMode]);

  const internalDocIds = useMemo(() => {
    return new Set(Object.keys(internalDocuments));
  }, []);

  const handleDocToggle = (docId: string) => {
    setOpenDocId((prev) => (prev === docId ? null : docId));
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds: string[] = [];
    const collect = (node: MindMapNode) => {
      allIds.push(node.id);
      node.children?.forEach(collect);
    };
    activeTree.children?.forEach(collect);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    setOpenDocId(null);
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6" data-testid="mindmap-view">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)" }}
          >
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <h1 className="text-xl font-bold text-white" data-testid="text-page-title">
              Maker: Control-First AI OS
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto" data-testid="text-page-subtitle">
            {lang === "ko"
              ? "Maker의 비전, 철학, 기술 아키텍처를 담은 문서를 탐색하세요. 각 배지를 클릭하면 문서가 펼쳐집니다."
              : "Explore documents covering Maker's vision, philosophy, and technical architecture. Click any badge to expand the document."}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
              {lang === "ko" ? "모두 펼치기" : "Expand All"}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              {lang === "ko" ? "모두 접기" : "Collapse All"}
            </Button>
          </div>
          {isDevMode && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium" data-testid="badge-dev-mode">
              <Lock className="h-3 w-3" />
              {lang === "ko" ? "개발자 모드 — 내부 전략 문서 포함" : "Developer Mode — Internal Strategy Docs Included"}
            </div>
          )}
        </div>

        <div className="grid gap-4" data-testid="mindmap-grid">
          {activeTree.children?.map((branch) => (
            <CategoryCard
              key={branch.id}
              node={branch}
              lang={lang}
              openDocId={openDocId}
              onDocToggle={handleDocToggle}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              allDocs={allDocs}
              internalDocIds={internalDocIds}
            />
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground" data-testid="text-footer-info">
          {lang === "ko"
            ? "© 2026 Maker. Control-First AI OS. 모든 문서는 Maker의 비전과 철학을 담고 있습니다."
            : "© 2026 Maker. Control-First AI OS. All documents reflect Maker's vision and philosophy."}
        </div>
      </div>
    </ScrollArea>
  );
}
