/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

const {increaseQuantifierByOne} = require('../../transform/utils');

/**
 * A regexp-tree plugin to merge quantifiers
 *
 * a{2}a+ ->
 * a{2}a{3} -> a{5}
 * a{1,2}a{0,3} -> a{1,5}
 */
module.exports = {

  Repetition(path) {
    const {node, parent} = path;

    if (
      parent.type !== 'Alternative' ||
      !path.index
    ) {
      return;
    }

    const previousSibling = path.getPreviousSibling();

    if (!previousSibling) {
      return;
    }

    if (previousSibling.node.type === 'Repetition') {
      if (!previousSibling.getChild().hasEqualSource(path.getChild())) {
        return;
      }

      let {
        from: previousSiblingFrom,
        to: previousSiblingTo
      } = extractFromTo(previousSibling.node.quantifier);
      let previousSiblingGreedy = previousSibling.node.quantifier.greedy;

      let {
        from: nodeFrom,
        to: nodeTo
      } = extractFromTo(node.quantifier);
      let nodeGreedy = node.quantifier.greedy;


      
      // TODO: simpify control-flow and definitions
      if (path.isForward()) {
        // r{n1}r{n2,m2} -> r{n1+n2,n1+m2}
        // r{n1}r{n2,m2}? -> r{n1+n2,n1+m2}?
        // r{n1}?r{n2,m2} -> r{n1+n2,n1+m2}
        // r{n1}?r{n2,m2}? -> r{n1+n2,n1+m2}?
        if (previousSiblingTo == previousSiblingFrom) {
          makeQuantifier(node, previousSiblingFrom + nodeFrom, previousSiblingTo, nodeTo, nodeGreedy);
          previousSibling.remove();
          return;
        }
        // r{n1,m1}r{0,m2} -> r{n1,m1+m2}
        if (previousSiblingGreedy && nodeGreedy && nodeFrom == 0) {
          makeQuantifier(node, previousSiblingFrom, previousSiblingTo, nodeTo, true);
          previousSibling.remove();
          return;
        }
      } else {
        // r{n1,m1}r{n2} -> r{n1+n2,m1+n2}
        // r{n1,m1}?r{n2} -> r{n1+n2,m1+n2}?
        // r{n1,m1}r{n2}? -> r{n1+n2,m1+n2}
        // r{n1,m1}?r{n2}? -> r{n1+n2,m1+n2}?
        if (nodeTo == nodeFrom) {
          makeQuantifier(node, previousSiblingFrom + nodeFrom, previousSiblingTo, nodeTo, previousSiblingGreedy);
          previousSibling.remove();
          return;
        }
        // r{0,m1}r{n2,m2} -> r{n2,m1+m2}
        if (previousSiblingGreedy && nodeGreedy && previousSiblingFrom == 0) {
          makeQuantifier(node, nodeFrom, previousSiblingTo, nodeTo, true);
          previousSibling.remove();
          return;
        }

      };
    }  
  }
};

function isGreedyOpenRange(quantifier) {
  return quantifier.greedy &&
    (
      quantifier.kind === '+' ||
      quantifier.kind === '*' ||
      (quantifier.kind === 'Range' && !quantifier.to)
    );
}

function extractFromTo(quantifier) {
  let from, to;
  if (quantifier.kind === '*') {
    from = 0;
  } else if (quantifier.kind === '+') {
    from = 1;
  } else if (quantifier.kind === '?') {
    from = 0;
    to = 1;
  } else {
    from = quantifier.from;
    if (quantifier.to) {
      to = quantifier.to;
    }
  }
  return {from, to};
}

function makeQuantifier(node, from, to1, to2, greedy){
  node.quantifier.kind = 'Range';
  if (to1 && to2) {
        node.quantifier.to = to1 + to2;
      } else {
        delete node.quantifier.to;
      }
  node.quantifier.from = from;
  node.quantifier.greedy = greedy;
}
