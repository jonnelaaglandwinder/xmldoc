var XmlDocument = require("../").XmlDocument;
var t = require("tap");

t.test("verify sax global in browser", function (t) {
  // "un-require" the xmldoc module that we loaded up top
  delete require.cache[require.resolve("../")];

  // also un-require the actual xmldoc module pulled in by index.js ('../')
  delete require.cache[require.resolve("../lib/xmldoc.js")];

  // this signal will be picked up on by xmldoc.js
  global.xmldocAssumeBrowser = true;

  t.throws(function () {
    require("../");
  });

  // try again, but this time satisfy the sax check
  delete require.cache[require.resolve("../")];
  delete require.cache[require.resolve("../lib/xmldoc.js")];
  global.sax = {};
  require("../");
  t.ok(global.XmlDocument);

  t.end();
});

t.test("extend util", function (t) {
  delete require.cache[require.resolve("../")];
  delete require.cache[require.resolve("../lib/xmldoc.js")];
  Object.prototype.cruftyExtension = "blah";
  try {
    require("../");
  } finally {
    delete Object.prototype.cruftyExtension;
  }
  t.end();
});

t.test("parse xml", function (t) {
  var xmlString = "<hello>world</hello>";
  var parsed = new XmlDocument(xmlString);
  t.ok(parsed);
  t.throws(function () {
    new XmlDocument();
  });
  t.throws(function () {
    new XmlDocument("  ");
  });
  t.end();
});

t.test("cdata handling", function (t) {
  var xmlString = "<hello><![CDATA[<world>]]></hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "<world>");
  t.end();
});

t.test("cdata and text handling", function (t) {
  var xmlString = "<hello>(<![CDATA[<world>]]>)</hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "(<world>)");
  t.end();
});

t.test("doctype handling", function (t) {
  var docWithType = new XmlDocument(
    "<!DOCTYPE HelloWorld><hello>world</hello>",
  );
  t.equal(docWithType.doctype, " HelloWorld");

  var docWithoutType = new XmlDocument("<hello>world</hello>");
  t.equal(docWithoutType.doctype, "");

  t.throws(function () {
    new XmlDocument("<hello><!DOCTYPE HelloWorld>world</hello>");
  });

  t.end();
});

t.test("comment handling", function (t) {
  var xmlString = "<hello><!-- World --></hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "");
  t.end();
});

t.test("comment and text handling", function (t) {
  var xmlString = "<hello>(<!-- World -->)</hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "()");
  t.end();
});

t.test("text, cdata, and comment handling", function (t) {
  var xmlString = "<hello>Hello<!-- , --> <![CDATA[<world>]]>!</hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "Hello <world>!");
  t.end();
});

t.test("text with elements handling", function (t) {
  var xmlString = "<hello>hello, <world/>!</hello>";
  var parsed = new XmlDocument(xmlString);
  t.equal(parsed.val, "hello, !");
  t.end();
});

t.test("text before root node", function (t) {
  var xmlString = "\n\n<hello>*</hello>";
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("text after root node", function (t) {
  var xmlString = "<hello>*</hello>\n\n";
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("text before root node with version", function (t) {
  var xmlString = '<?xml version="1.0"?>\n\n<hello>*</hello>';
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("text after root node with version", function (t) {
  var xmlString = '<?xml version="1.0"?><hello>*</hello>\n\n';
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("comment before root node", function (t) {
  var xmlString = "<!-- hello --><world>*</world>";
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("comment after root node", function (t) {
  var xmlString = "<hello>*</hello><!-- world -->";
  var xml = new XmlDocument(xmlString);

  t.equal(xml.val, "*");
  t.equal(xml.children.length, 1);
  t.end();
});

t.test("error handling", function (t) {
  var xmlString = "<hello><unclosed-tag></hello>";

  t.throws(function () {
    var parsed = new XmlDocument(xmlString);
  });

  t.end();
});

t.test("tag locations", function (t) {
  var xmlString = '<books><book title="Twilight"/></books>';
  var books = new XmlDocument(xmlString);

  var book = books.children[0];
  t.equal(book.attr.title, "Twilight");
  t.equal(book.startTagPosition, 8);
  t.equal(book.line, 0);
  t.equal(book.column, 31);
  t.equal(book.position, 31);
  t.end();
});

t.test("eachChild", function (t) {
  var xmlString =
    '<books><book title="Twilight"/><book title="Twister"/></books>';
  var books = new XmlDocument(xmlString);

  expectedTitles = ["Twilight", "Twister"];

  books.eachChild(function (book, i, books) {
    t.equal(book.attr.title, expectedTitles[i]);
  });

  called = 0;
  books.eachChild(function (book, i, books) {
    called++;
    return false; // test that returning false short-circuits the loop
  });
  t.equal(called, 1);

  t.end();
});

t.test("eachChild with text and comments", function (t) {
  var xmlString =
    '<books><book title="Twilight"/>text!<book title="Twister"/><!--comment!--></books>';
  var books = new XmlDocument(xmlString);

  expectedTitles = ["Twilight", "Twister"];

  var elI = 0;

  books.eachChild(function (book, i, books) {
    t.equal(book.attr.title, expectedTitles[elI++]);
  });

  called = 0;
  books.eachChild(function (book, i, books) {
    called++;
    return false; // test that returning false short-circuits the loop
  });
  t.equal(called, 1);

  t.end();
});

for (var method of [
  "getAttributeNS",
  "hasAttributeNS",
  "setAttributeNS",
  "childNamedNS",
  "childrenNamedNS",
  "childWithAttributeNS",
  "descendantsNamedNS",
  "descendantWithPathNS",
  "valueWithPathNS",
]) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book/></books>';
  var books = new XmlDocument(xmlString);

  t.test(`${method} throws when xmlns is not enabled`, function (t) {
    t.throws(() => books[method]());
    t.end();
  });
}

t.test("getAttributeNS", function (t) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book ns:title="Twilight"/></books>';
  var books = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var book = books.childNamed("ns:book");
  t.equal(book.getAttributeNS("http://example.com/books", "title"), "Twilight");

  t.end();
});

t.test("hasAttributeNS", function (t) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book ns:title="Twilight"/></books>';
  var books = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var book = books.childNamed("ns:book");
  t.equal(book.hasAttributeNS("http://example.com/books", "title"), true);
  t.equal(book.hasAttributeNS("http://example.com/books", "author"), false);

  t.end();
});

t.test("setAttributeNS", function (t) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book ns:title="Twilight"/></books>';
  var books = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var book = books.childNamed("ns:book");
  book.setAttributeNS("http://example.com/books", "title", "New Moon");
  book.setAttributeNS("http://example.com/books", "author", "Stephenie Meyer");
  book.setAttributeNS("http://example.com/non-existent", "attr", "value");
  t.equal(
    book.toString(),
    '<ns:book ns:title="New Moon" ns:author="Stephenie Meyer"/>',
  );

  t.end();
});

t.test(
  "set unnamespaced attribute through accessor with xmlns enabled",
  function (t) {
    var xmlString =
      '<books xmlns:ns="http://example.com/books"><ns:book title="Twilight"/></books>';
    var books = new XmlDocument(xmlString, {
      xmlns: true,
    });

    var book = books.childNamed("ns:book");
    book.attr.title = "New Moon";
    book.attr.publicationDate = "2006-08-21";
    t.equal(
      book.toString(),
      '<ns:book title="New Moon" publicationDate="2006-08-21"/>',
    );

    t.end();
  },
);

t.test("set namespaced attribute through accessor", function (t) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book ns:title="Twilight"/></books>';
  var books = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var book = books.childNamed("ns:book");
  book.attr["non-existent:attr"] = "value";
  book.attr["ns:title"] = "New Moon";
  book.attr["ns:publicationDate"] = "2006-08-21";
  t.equal(
    book.toString(),
    '<ns:book ns:title="New Moon" ns:publicationDate="2006-08-21"/>',
  );

  t.end();
});

t.test("childNamed", function (t) {
  var xmlString = "<books><book/><good-book/></books>";
  var books = new XmlDocument(xmlString);

  var goodBook = books.childNamed("good-book");
  t.equal(goodBook.name, "good-book");

  var badBook = books.childNamed("bad-book");
  t.equal(badBook, undefined);

  t.end();
});

t.test("childNamedNS", function (t) {
  var xmlString =
    '<books xmlns:ns="http://example.com/books"><ns:book/><ns:good-book/></books>';
  var books = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var goodBook = books.childNamedNS("http://example.com/books", "good-book");
  t.equal(goodBook.name, "ns:good-book");
  t.equal(goodBook.local, "good-book");

  var badBook = books.childNamedNS("http://example.com/books", "bad-book");
  t.equal(badBook, undefined);

  var goodBookUnqualified = books.childNamedNS("", "good-book");
  t.equal(goodBookUnqualified, undefined);

  t.end();
});

t.test("childNamed with text", function (t) {
  var xmlString = "<books><book/>text<good-book/></books>";
  var books = new XmlDocument(xmlString);

  var goodBook = books.childNamed("good-book");
  t.equal(goodBook.name, "good-book");

  var badBook = books.childNamed("bad-book");
  t.equal(badBook, undefined);

  t.end();
});

t.test("childrenNamed", function (t) {
  var xmlString =
    '<fruits><apple sweet="yes"/><orange/><apple sweet="no"/><banana/></fruits>';
  var fruits = new XmlDocument(xmlString);

  var apples = fruits.childrenNamed("apple");
  t.equal(apples.length, 2);
  t.equal(apples[0].attr.sweet, "yes");
  t.equal(apples[1].attr.sweet, "no");
  t.end();
});

t.test("childrenNamedNS", function (t) {
  var xmlString =
    '<fruits xmlns:ns="http://example.com/fruits"><ns:apple sweet="yes"/><orange/><ns:apple sweet="no"/><banana/></fruits>';
  var fruits = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var apples = fruits.childrenNamedNS("http://example.com/fruits", "apple");

  t.equal(apples.length, 2);
  t.equal(apples[0].attr.sweet, "yes");
  t.equal(apples[1].attr.sweet, "no");

  t.end();
});

t.test("childWithAttribute", function (t) {
  var xmlString =
    '<fruits><apple pick="no"/><orange rotten="yes"/><apple pick="yes"/><banana/></fruits>';
  var fruits = new XmlDocument(xmlString);

  var pickedFruit = fruits.childWithAttribute("pick", "yes");
  t.equal(pickedFruit.name, "apple");
  t.equal(pickedFruit.attr.pick, "yes");

  var rottenFruit = fruits.childWithAttribute("rotten");
  t.equal(rottenFruit.name, "orange");

  var peeled = fruits.childWithAttribute("peeled");
  t.equal(peeled, undefined);

  t.end();
});

t.test("childWithAttributeNS", function (t) {
  var xmlString =
    '<fruits xmlns:ns="http://example.com/fruits"><ns:apple pick="no"/><orange ns:rotten="yes"/><ns:apple ns:pick="yes"/><banana/></fruits>';
  var fruits = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var pickedFruit = fruits.childWithAttributeNS(
    "http://example.com/fruits",
    "pick",
    "yes",
  );
  t.equal(pickedFruit.name, "ns:apple");
  t.equal(pickedFruit.attr["ns:pick"], "yes");

  var rottenFruit = fruits.childWithAttributeNS(
    "http://example.com/fruits",
    "rotten",
  );
  t.equal(rottenFruit.name, "orange");

  var peeled = fruits.childWithAttributeNS(
    "http://example.com/fruits",
    "peeled",
  );
  t.equal(peeled, undefined);

  t.end();
});

t.test("childWithAttribute with text", function (t) {
  var xmlString =
    '<fruits><apple pick="no"/><orange rotten="yes"/>text<apple pick="yes"/><banana/></fruits>';
  var fruits = new XmlDocument(xmlString);

  var pickedFruit = fruits.childWithAttribute("pick", "yes");
  t.equal(pickedFruit.name, "apple");
  t.equal(pickedFruit.attr.pick, "yes");

  var rottenFruit = fruits.childWithAttribute("rotten");
  t.equal(rottenFruit.name, "orange");

  var peeled = fruits.childWithAttribute("peeled");
  t.equal(peeled, undefined);

  t.end();
});

t.test("descendantsNamed", function (t) {
  var xmlString =
    '<navigation><item id="1"/><divider/><item id="2"><item id="2.1"/><item id="2.2"><item id="2.2.1"/></item><divider/><item id="3"/></item></navigation>';
  var navigation = new XmlDocument(xmlString);

  var items = navigation.descendantsNamed("item");
  t.equal(items.length, 6);
  t.equal(items[0].attr.id, "1");
  t.equal(items[1].attr.id, "2");
  t.equal(items[2].attr.id, "2.1");
  t.equal(items[3].attr.id, "2.2");
  t.equal(items[4].attr.id, "2.2.1");
  t.equal(items[5].attr.id, "3");
  t.end();
});

t.test("descendantsNamedNS", function (t) {
  var xmlString = `
    <navigation xmlns:ns="http://example.com/navigation">
      <ns:item id="1"/>
      <divider/>
      <ns:item id="2"/>
      <ns:item id="2.1"/>
      <ns:item id="2.2"/>
      <ns:item id="2.2.1"/>
      <divider/>
      <ns:item id="3"/>
    </navigation>
  `;
  var navigation = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var items = navigation.descendantsNamedNS(
    "http://example.com/navigation",
    "item",
  );

  t.equal(items.length, 6);
  t.equal(items[0].attr.id, "1");
  t.equal(items[1].attr.id, "2");
  t.equal(items[2].attr.id, "2.1");
  t.equal(items[3].attr.id, "2.2");
  t.equal(items[4].attr.id, "2.2.1");
  t.equal(items[5].attr.id, "3");
  t.end();
});

t.test("descendantWithPath", function (t) {
  var xmlString =
    "<book><author><first>George R.R.</first><last>Martin</last></author></book>";
  var book = new XmlDocument(xmlString);

  var lastNameNode = book.descendantWithPath("author.last");
  t.equal(lastNameNode.val, "Martin");

  var middleNameNode = book.descendantWithPath("author.middle");
  t.equal(middleNameNode, undefined);

  var publisherNameNode = book.descendantWithPath("publisher.first");
  t.equal(publisherNameNode, undefined);

  t.end();
});

t.test("descendantWithPathNS", function (t) {
  var xmlString =
    '<book xmlns:ns="http://example.com/book"><ns:author><ns:first>George R.R.</ns:first><ns:last>Martin</ns:last></ns:author></book>';
  var book = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var lastNameNode = book.descendantWithPathNS(
    "http://example.com/book",
    "author.last",
  );
  t.equal(lastNameNode.val, "Martin");

  var middleNameNode = book.descendantWithPathNS(
    "http://example.com/book",
    "author.middle",
  );
  t.equal(middleNameNode, undefined);

  var publisherNameNode = book.descendantWithPathNS(
    "http://example.com/book",
    "publisher.first",
  );
  t.equal(publisherNameNode, undefined);

  t.end();
});

t.test("descendantWithPath with text", function (t) {
  var xmlString =
    "<book><author>text<first>George R.R.</first><last>Martin</last></author></book>";
  var book = new XmlDocument(xmlString);

  var lastNameNode = book.descendantWithPath("author.last");
  t.equal(lastNameNode.val, "Martin");

  var middleNameNode = book.descendantWithPath("author.middle");
  t.equal(middleNameNode, undefined);

  var publisherNameNode = book.descendantWithPath("publisher.first");
  t.equal(publisherNameNode, undefined);

  t.end();
});

t.test("valueWithPath", function (t) {
  var xmlString =
    '<book><author><first>George R.R.</first><last hyphenated="no">Martin</last></author></book>';
  var book = new XmlDocument(xmlString);

  var lastName = book.valueWithPath("author.last");
  t.equal(lastName, "Martin");

  var lastNameHyphenated = book.valueWithPath("author.last@hyphenated");
  t.equal(lastNameHyphenated, "no");

  var publisherName = book.valueWithPath("publisher.last@hyphenated");
  t.equal(publisherName, undefined);

  t.end();
});

t.test("valueWithPathNS", function (t) {
  var xmlString =
    '<book xmlns:ns="http://example.com/book"><ns:author><ns:first>George R.R.</ns:first><ns:last ns:hyphenated="no">Martin</ns:last></ns:author></book>';
  var book = new XmlDocument(xmlString, {
    xmlns: true,
  });

  var lastName = book.valueWithPathNS("http://example.com/book", "author.last");
  t.equal(lastName, "Martin");

  var lastNameHyphenated = book.valueWithPathNS(
    "http://example.com/book",
    "author.last@hyphenated",
  );
  t.equal(lastNameHyphenated, "no");

  var publisherName = book.valueWithPathNS(
    "http://example.com/book",
    "publisher.last@hyphenated",
  );
  t.equal(publisherName, undefined);

  t.end();
});

t.test("valueWithPath with text", function (t) {
  var xmlString =
    '<book><author>text<first>George R.R.</first><last hyphenated="no">Martin</last></author></book>';
  var book = new XmlDocument(xmlString);

  var lastName = book.valueWithPath("author.last");
  t.equal(lastName, "Martin");

  var lastNameHyphenated = book.valueWithPath("author.last@hyphenated");
  t.equal(lastNameHyphenated, "no");

  var publisherName = book.valueWithPath("publisher.last@hyphenated");
  t.equal(publisherName, undefined);

  t.end();
});

t.test("toString", function (t) {
  var xmlString = '<books><book title="Twilight"/></books>';
  var doc = new XmlDocument(xmlString);

  t.equal(doc.toString(), '<books>\n  <book title="Twilight"/>\n</books>');
  t.equal(
    doc.toString({ compressed: true }),
    '<books><book title="Twilight"/></books>',
  );

  xmlString = "<hello> world </hello>";
  doc = new XmlDocument(xmlString);

  t.equal(doc.toString(), "<hello>world</hello>");
  t.equal(doc.toString({ preserveWhitespace: true }), "<hello> world </hello>");

  xmlString = "<hello><![CDATA[<world>]]></hello>";
  doc = new XmlDocument(xmlString);

  t.equal(doc.toString(), "<hello><![CDATA[<world>]]></hello>");

  xmlString = "<hello>Hello<!-- , --> <![CDATA[<world>]]>!</hello>";
  doc = new XmlDocument(xmlString);

  t.equal(
    doc.toString({ preserveWhitespace: true }),
    "<hello>\n  Hello\n  <!-- , -->\n   \n  <![CDATA[<world>]]>\n  !\n</hello>",
  );

  xmlString = "<hello>hello, <world/>!</hello>";
  doc = new XmlDocument(xmlString);

  t.equal(doc.toString(), "<hello>\n  hello,\n  <world/>\n  !\n</hello>");

  xmlString =
    "<hello>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam et accumsan nisi.</hello>";
  doc = new XmlDocument(xmlString);

  t.equal(doc.toString(), xmlString);
  t.equal(
    doc.toString({ trimmed: true }),
    "<hello>Lorem ipsum dolor sit ame…</hello>",
  );

  try {
    // test that adding stuff to the Object prototype doesn't interfere with attribute exporting
    Object.prototype.cruftyExtension =
      "You don't want this string to be exported!";

    var xmlString = '<books><book title="Twilight"/></books>';
    var doc = new XmlDocument(xmlString);

    t.equal(doc.toString(), '<books>\n  <book title="Twilight"/>\n</books>');
  } finally {
    delete Object.prototype.cruftyExtensionMethod;
  }

  xmlString = "<hello>world<earth/><moon/></hello>";
  doc = new XmlDocument(xmlString);
  t.equal(doc.toString({ compressed: true }), xmlString);

  t.end();
});

t.test(
  "XmlDocument serializes the same with and without xmlns option",
  function (t) {
    var xmlString =
      '<books xmlns:ns="http://example.com/books"><ns:book ns:title="Twilight"/></books>';
    var doc1 = new XmlDocument(xmlString);
    var doc2 = new XmlDocument(xmlString, {
      xmlns: true,
    });

    t.equal(JSON.stringify(doc1), JSON.stringify(doc2));
    t.end();
  },
);

t.test("throws when xmlns is used and Proxy is not supported", function (t) {
  var _Proxy = globalThis.Proxy;
  globalThis.Proxy = undefined;

  t.throws(() => {
    new XmlDocument("<hello/>", { xmlns: true });
  });

  globalThis.Proxy = _Proxy;

  t.end();
});
