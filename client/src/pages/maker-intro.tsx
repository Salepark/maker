import { useState } from "react";
import { useLanguage } from "@/lib/language-provider";
import { mindMapTree, documents, type MindMapNode } from "@/data/maker-docs";
import { ArrowLeft, ChevronDown, ChevronRight, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function MindMapBranch({
  node,
  depth,
  lang,
  onDocClick,
  expandedNodes,
  toggleNode,
}: {
  node: MindMapNode;
  depth: number;
  lang: string;
  onDocClick: (docId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const label = lang === "ko" ? node.labelKo : node.labelEn;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isLeaf = !hasChildren;

  if (isLeaf && node.docId) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-accent transition-colors text-xs py-1.5 px-3 whitespace-normal text-left leading-tight border-2"
        style={{ borderColor: node.color + "60", color: node.color }}
        onClick={() => onDocClick(node.docId!)}
        data-testid={`badge-doc-${node.id}`}
      >
        <FileText className="h-3 w-3 mr-1.5 shrink-0" style={{ color: node.color }} />
        {label}
      </Badge>
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
          {node.children!.map((child) => {
            const childHasChildren = child.children && child.children.length > 0;
            if (childHasChildren) {
              return (
                <MindMapBranch
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  lang={lang}
                  onDocClick={onDocClick}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                />
              );
            }
            return (
              <div key={child.id} className="py-0.5">
                <MindMapBranch
                  node={child}
                  depth={depth + 1}
                  lang={lang}
                  onDocClick={onDocClick}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  node,
  lang,
  onDocClick,
  expandedNodes,
  toggleNode,
}: {
  node: MindMapNode;
  lang: string;
  onDocClick: (docId: string) => void;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
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
                onDocClick={onDocClick}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DocumentView({
  docId,
  lang,
  onBack,
}: {
  docId: string;
  lang: string;
  onBack: () => void;
}) {
  const doc = documents[docId];
  if (!doc) return null;

  const title = lang === "ko" ? doc.titleKo : doc.titleEn;
  const content = lang === "ko" ? doc.contentKo : doc.contentEn;

  return (
    <div className="max-w-3xl mx-auto p-6" data-testid="document-view">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-2"
        onClick={onBack}
        data-testid="button-back-to-map"
      >
        <ArrowLeft className="h-4 w-4" />
        {lang === "ko" ? "마인드맵으로 돌아가기" : "Back to Mind Map"}
      </Button>
      <article className="prose prose-sm dark:prose-invert max-w-none">
        <h1 className="text-2xl font-bold mb-6 text-foreground leading-tight" data-testid="text-doc-title">
          {title}
        </h1>
        {content.map((paragraph, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed mb-4 text-sm" data-testid={`text-paragraph-${i}`}>
            {paragraph}
          </p>
        ))}
      </article>
    </div>
  );
}

export default function MakerIntro() {
  const { language } = useLanguage();
  const lang = language;
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["identity", "philosophy", "features", "business", "demo", "overview"])
  );

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
    mindMapTree.children?.forEach(collect);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (selectedDoc) {
    return (
      <ScrollArea className="h-full">
        <DocumentView docId={selectedDoc} lang={lang} onBack={() => setSelectedDoc(null)} />
      </ScrollArea>
    );
  }

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
              ? "Maker의 비전, 철학, 기술 아키텍처, 비즈니스 전략을 담은 문서를 탐색하세요. 각 배지를 클릭하면 상세 문서를 볼 수 있습니다."
              : "Explore documents covering Maker's vision, philosophy, technical architecture, and business strategy. Click any badge to view the full document."}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
              {lang === "ko" ? "모두 펼치기" : "Expand All"}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              {lang === "ko" ? "모두 접기" : "Collapse All"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4" data-testid="mindmap-grid">
          {mindMapTree.children?.map((branch) => (
            <CategoryCard
              key={branch.id}
              node={branch}
              lang={lang}
              onDocClick={setSelectedDoc}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
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
