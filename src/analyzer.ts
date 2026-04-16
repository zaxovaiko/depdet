import {
	type Identifier,
	type Symbol as MorphSymbol,
	type Node,
	type Project,
	type SourceFile,
	SyntaxKind,
} from "ts-morph";
import { allSourceFiles } from "./project.ts";
import { symbolIdOf, uniqueBy } from "./scanner.ts";
import type { Deprecation, Occurrence } from "./types.ts";

const isUserSource = (sf: SourceFile): boolean =>
	!sf.getFilePath().includes("/node_modules/");

const isDeclarationName = (id: Identifier): boolean => {
	const parent = id.getParent();
	if (!parent) return false;
	const kind = parent.getKind();
	// Name slot of a declaration
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

const toOccurrence = (id: Identifier, deprecation: Deprecation): Occurrence => {
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

const matchDeprecation = (
	id: Identifier,
	byId: ReadonlyMap<string, Deprecation>,
): Deprecation | undefined => {
	const sym = resolveSymbol(id);
	if (!sym) return undefined;
	const decls = sym.getDeclarations();
	for (const decl of decls) {
		const dep = byId.get(symbolIdOf(decl));
		if (dep) return dep;
	}
	return undefined;
};

const occurrencesInFile = (
	sf: SourceFile,
	byId: ReadonlyMap<string, Deprecation>,
): readonly Occurrence[] =>
	sf
		.getDescendantsOfKind(SyntaxKind.Identifier)
		.filter((id) => !isDeclarationName(id))
		.flatMap((id) => {
			const dep = matchDeprecation(id, byId);
			return dep ? [toOccurrence(id, dep)] : [];
		});

export const findOccurrences = (
	project: Project,
	deprecations: readonly Deprecation[],
): readonly Occurrence[] => {
	const byId = new Map(deprecations.map((d) => [d.symbolId, d]));
	return allSourceFiles(project)
		.filter(isUserSource)
		.flatMap((sf) => occurrencesInFile(sf, byId))
		.filter(
			uniqueBy(
				(o) => `${o.file}:${o.line}:${o.column}:${o.deprecation.symbolId}`,
			),
		);
};
