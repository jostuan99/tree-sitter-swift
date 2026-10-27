protocol Shape {
//       ^ definition.interface
  func area() -> Double
  //   ^ definition.function
}

struct Square: Shape {
//     ^ definition.class
//             ^ reference.implementation
  let side: Double
  //  ^ definition.field

  func area() -> Double { side * side }
  //   ^ definition.function
}

enum Kind {
//   ^ definition.class
  case small
  //   ^ definition.constant
}

let s = makeSquare()
//      ^ reference.call
