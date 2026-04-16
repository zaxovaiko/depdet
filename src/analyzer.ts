import {
	type Identifier,
	type Symbol as MorphSymbol,
	type Node,
	type Project,
	type SourceFile,
	SyntaxKind,
} from "ts-morph";
import { allSourceFiles } from "./project.ts";
import { toDeprecation, uniqueBy } from "./scanner.ts";
import type { Deprecation, Occurrence } from "./types.ts";

const isUserSource = (sf: SourceFile): boolean =>
	!sf.getFilePath().includes("/node_modules/");

const isDeclarationName = (id: Identifier): boolean => {
	const parent = id.getParent();
	if (!parent) return false;
	const kind = parent.getKind();
	switch (kind) {
		case SyntaxKind.FunctionDeclaration:
		case SyntaxKind.MethodDeclaration:
		case SyntaxKind.MethodSignature:
		case SyntaxKind.ClassDeclaration:
		case SyntaxKind.InterfaceDeclaration:
		case SyntaxKind.TypeAliasDeclaration:
		case SyntaxKind.EnumDeclaration:
		case SyntaxKind.EnumMember:
		case SyntaxKind.VariableDeclaration:
		case SyntaxKind.PropertyDeclaration:
		case SyntaxKind.PropertySignature:
		case SyntaxKind.GetAccessor:
		case SyntaxKind.SetAccessor: {
			const named = parent as Node & { getNameNode?: () => Node | undefined };
			return named.getNameNode?.() === id;
		}
		default:
			return false;
	}
};

const resolveSymbol = (id: Identifier): MorphSymbol | undefined => {
	const sym = id.getSymbol();
	if (!sym) return undefined;
	const aliased = sym.getAliasedSymbol();
	return aliased ?? sym;
};

const trimSnippet = (text: string, max = 120): string => {
	const trimmed = text.trim();
	return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

const makeOccurrence = (id: Identifier, deprecation: Deprecation): Occurrence => {
	const sf = id.getSourceFile();
	const start = id.getStart();
	const { line, column } = sf.getLineAndColumnAtPos(start);
	const lineText = sf.getFullText().split(/\r?\n/)[line - 1] ?? "";
	return {
		deprecation,
		file: sf.getFilePath(),
		line,
		column,
		snippet: trimSnippet(lineText),
	};
};

// Resolves each identifier's declaration lazily via the TypeScript type checker.
// Dep .d.ts files are never loaded in bulk — only declarations actually referenced
// in user source are checked, keeping memory proportional to imports, not dep count.
export const findOccurrences = (
	project: Project,
	noDeps = false,
): readonly Occurrence[] =>
	allSourceFiles(project)
		.filter(isUserSource)
		.flatMap((sf) => sf.getDescendantsOfKind(SyntaxKind.Identifier))
		.filter((id) => !isDeclarationName(id))
		.flatMap((id) => {
			const sym = resolveSymbol(id);
			if (!sym) return [];
			for (const decl of sym.getDeclarations()) {
				if (
					noDeps &&
					decl.getSourceFile().getFilePath().includes("/node_modules/")
				)
					continue;
				const dep = toDeprecation(decl);
				if (dep) return [makeOccurrence(id, dep)];
			}
			return [];
		})
		.filter(
			uniqueBy(
				(o) => `${o.file}:${o.line}:${o.column}:${o.deprecation.symbolId}`,
			),
		);
