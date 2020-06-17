module.exports = {
  "env": {
    "node": true,
    "browser": true,
    "es6": true
  },
  "parser": "babel-eslint",
  "extends": "airbnb",
  "rules": {
    "react/destructuring-assignment": "off",
    "react/jsx-filename-extension": "off",
    "no-use-before-define": ["error", { "variables": false }]
  }
}