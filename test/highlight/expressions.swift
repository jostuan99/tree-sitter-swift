let greeting = "Hello \(name)\n"
// <- keyword
//             ^ string
//                    ^ punctuation.special
//                            ^ string.escape

let value = try? load(x) ?? 0.5
//          ^ keyword.exception
//               ^ function.call
//                       ^ operator
//                          ^ number.float

items.map { $0 * 2 }.sorted(by: <)
//    ^ function.method.call
//          ^ variable.builtin
//                          ^ label
//                              ^ operator

if flag == true, let x = y as? Int {
// <- keyword.conditional
//         ^ boolean
//                         ^ keyword.operator
}

for i in 0..<10 where i > 2 {
// <- keyword.repeat
//    ^ keyword
//          ^ operator
}

let p = Point(x: 1)
//      ^ type

#if DEBUG
// <- keyword.directive
print(#file)
//    ^ function.macro
#endif
