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
    "react/forbid-prop-types": "off",
    "react/no-unused-state": "off",
    "no-use-before-define": ["error", { "variables": false }]
  }
}