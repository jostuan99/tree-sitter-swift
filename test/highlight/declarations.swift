import Foundation
// <- keyword.import
//     ^ module

public final class ViewModel<T>: Base {
// <- keyword.modifier
//     ^ keyword.modifier
//           ^ keyword.type
//                 ^ type
//                           ^ type.parameter
//                               ^ type
  @Published var items: [T] = []
  // <- attribute
  //          ^ keyword
  //              ^ variable.member

  func load(from url: URL) async throws -> Int {
  // <- keyword.function
  //   ^ function
  //        ^ variable.parameter
  //             ^ variable.parameter
  //                  ^ type
  //                         ^ keyword.coroutine
  //                               ^ keyword.exception
    return 42
    // <- keyword.return
    //     ^ number
  }
}

enum Direction {
  case north
  //   ^ constant
}
