import {
  type JSDoc,
  type JSDocableNode,
  type Node,
  type Project,
  type SourceFile,
  SyntaxKind,
} from "ts-morph";
import { extract } from "./extractor.ts";
import { allSourceFiles } from "./project.ts";
import type { DeclKind, Deprecation } from "./types.ts";

const KIND_MAP: ReadonlyMap<SyntaxKind, DeclKind> = new Map([
  [SyntaxKind.FunctionDeclaration, "function"],
  [SyntaxKind.MethodDeclaration, "method"],
  [SyntaxKind.MethodSignature, "method"],
  [SyntaxKind.ClassDeclaration, "class"],
  [SyntaxKind.PropertyDeclaration, "property"],
  [SyntaxKind.PropertySignature, "property"],
  [SyntaxKind.VariableDeclaration, "variable"],
  [SyntaxKind.TypeAliasDeclaration, "type"],
  [SyntaxKind.InterfaceDeclaration, "interface"],
  [SyntaxKind.EnumDeclaration, "enum"],
  [SyntaxKind.EnumMember, "enum"],
  [SyntaxKind.GetAccessor, "accessor"],
  [SyntaxKind.SetAccessor, "accessor"],
] as const);

const DECL_KINDS = [...KIND_MAP.keys()];

type JsDocableDecl = JSDocableNode & Node;

const hasJsDocs = (node: Node): node is JsDocableDecl =>
  typeof (node as Partial<JSDocableNode>).getJsDocs === "function";

const findDeprecatedTag = (doc: JSDoc) =>
  doc.getTags().find((t) => t.getTagName() === "deprecated");

const jsDocsFor = (decl: Node): readonly JSDoc[] => {
  const direct = hasJsDocs(decl) ? decl.getJsDocs() : [];
  if (direct.length > 0) return direct;
  // VariableDeclaration carries no JSDoc directly; its parent VariableStatement does.
  if (decl.getKind() === SyntaxKind.VariableDeclaration) {
    const stmt = decl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    if (stmt && hasJsDocs(stmt)) return stmt.getJsDocs();
  }
  return [];
};

const firstDeprecatedTag = (decl: Node) =>
  jsDocsFor(decl).flatMap((d) => {
    const tag = findDeprecatedTag(d);
    return tag ? [tag] : [];
  })[0];

const getName = (decl: Node): string => {
  const named = decl as Node & { getName?: () => string | undefined };
  if (typeof named.getName === "function") {
    const n = named.getName();
    if (n) return n;
  }
  const idKid = decl.getFirstChildByKind(SyntaxKind.Identifier);
  return idKid?.getText() ?? "<anonymous>";
};

const getQualifiedName = (decl: Node, name: string): string => {
  const classDecl = decl.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
  const ifaceDecl = decl.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration);
  const enumDecl = decl.getFirstAncestorByKind(SyntaxKind.EnumDeclaration);
  const parent = classDecl ?? ifaceDecl ?? enumDecl;
  if (!parent) return name;
  const parentName = getName(parent);
  return `${parentName}.${name}`;
};

const makeSymbolId = (decl: Node, qualifiedName: string): string => {
  const file = decl.getSourceFile().getFilePath();
  return `${file}#${qualifiedName}`;
};

export const symbolIdOf = (decl: Node): string => {
  const name = getName(decl);
  const qualifiedName = getQualifiedName(decl, name);
  return makeSymbolId(decl, qualifiedName);
};

export const toDeprecation = (decl: Node): Deprecation | null => {
  const tag = firstDeprecatedTag(decl);
  if (!tag) return null;

  const name = getName(decl);
  if (name === "<anonymous>") return null;

  const qualifiedName = getQualifiedName(decl, name);
  const kind = KIND_MAP.get(decl.getKind()) ?? "variable";
  const deprecationText = tag.getCommentText() ?? tag.getComment()?.toString() ?? "";
  const { replacement, source } = extract(deprecationText);
  const { line } = decl.getSourceFile().getLineAndColumnAtPos(decl.getStart());

  return {
    symbolId: makeSymbolId(decl, qualifiedName),
    name,
    qualifiedName,
    kind,
    declFile: decl.getSourceFile().getFilePath(),
    declLine: line,
    deprecationText: deprecationText.trim(),
    replacement,
    replacementSource: source,
  };
};

const uniqueBy = <T, K>(keyFn: (x: T) => K) => {
  const seen = new Set<K>();
  return (x: T): boolean => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  };
};

const shouldScanFile = (sf: SourceFile, noDeps: boolean): boolean => {
  const path = sf.getFilePath();
  if (noDeps && path.includes("/node_modules/")) return false;
  return true;
};

export const collectDeprecations = (project: Project, noDeps = false): readonly Deprecation[] =>
  allSourceFiles(project)
    .filter((sf) => shouldScanFile(sf, noDeps))
    .flatMap((sf) => DECL_KINDS.flatMap((k) => sf.getDescendantsOfKind(k)))
    .map(toDeprecation)
    .filter((d): d is Deprecation => d !== null)
    .filter(uniqueBy((d) => d.symbolId));

export { uniqueBy };
