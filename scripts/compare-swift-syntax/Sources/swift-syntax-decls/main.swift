// Prints the declarations that swift-syntax finds in each file, one per line:
//
//     <file>\t<kind>\t<name>\t<line>
//
// The kinds match the `definition.*` captures of queries/tags.scm, so the
// output can be compared with tree-sitter (see scripts/compare-tags.ts).
//
// Usage: swift-syntax-decls <file>...   (reads file paths from stdin when none are given)

import Foundation
import SwiftParser
import SwiftSyntax

final class DeclarationCollector: SyntaxVisitor {
    let converter: SourceLocationConverter
    var lines: [String] = []
    let file: String

    init(file: String, tree: SourceFileSyntax) {
        self.file = file
        self.converter = SourceLocationConverter(fileName: file, tree: tree)
        super.init(viewMode: .sourceAccurate)
    }

    private func record(_ kind: String, _ token: TokenSyntax) {
        let line = token.startLocation(converter: converter).line
        lines.append("\(file)\t\(kind)\t\(token.text)\t\(line)")
    }

    override func visit(_ node: ClassDeclSyntax) -> SyntaxVisitorContinueKind {
        record("class", node.name)
        return .visitChildren
    }

    override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
        record("class", node.name)
        return .visitChildren
    }

    override func visit(_ node: ActorDeclSyntax) -> SyntaxVisitorContinueKind {
        record("class", node.name)
        return .visitChildren
    }

    override func visit(_ node: EnumDeclSyntax) -> SyntaxVisitorContinueKind {
        record("class", node.name)
        return .visitChildren
    }

    override func visit(_ node: ProtocolDeclSyntax) -> SyntaxVisitorContinueKind {
        record("interface", node.name)
        return .visitChildren
    }

    override func visit(_ node: FunctionDeclSyntax) -> SyntaxVisitorContinueKind {
        // Operator functions are not tagged by queries/tags.scm.
        if case .identifier = node.name.tokenKind {
            record("function", node.name)
        }
        return .visitChildren
    }

    override func visit(_ node: InitializerDeclSyntax) -> SyntaxVisitorContinueKind {
        record("method", node.initKeyword)
        return .visitChildren
    }

    override func visit(_ node: MacroDeclSyntax) -> SyntaxVisitorContinueKind {
        record("macro", node.name)
        return .visitChildren
    }

    override func visit(_ node: EnumCaseElementSyntax) -> SyntaxVisitorContinueKind {
        record("constant", node.name)
        return .visitChildren
    }

    override func visit(_ node: TypeAliasDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type", node.name)
        return .visitChildren
    }

    override func visit(_ node: AssociatedTypeDeclSyntax) -> SyntaxVisitorContinueKind {
        record("type", node.name)
        return .visitChildren
    }
}

var paths = Array(CommandLine.arguments.dropFirst())
if paths.isEmpty {
    while let line = readLine() {
        if !line.isEmpty { paths.append(line) }
    }
}

for path in paths {
    guard let source = try? String(contentsOfFile: path, encoding: .utf8) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!)
        continue
    }
    let tree = Parser.parse(source: source)
    let collector = DeclarationCollector(file: path, tree: tree)
    collector.walk(tree)
    for line in collector.lines {
        print(line)
    }
}
