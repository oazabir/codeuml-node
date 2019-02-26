var $ = $ || jQuery;
var DEFAULT_DIAGRAM_TYPE = "sequence_diagram";
var myCodeMirror;
var defaultUmlText;
var lastUmlDiagram = loadUmlType();
if (lastUmlDiagram == null) lastUmlDiagram = DEFAULT_DIAGRAM_TYPE;

var diagramId = "";
if (document.location.hash > 0) {
  diagramId = document.location.hash;
}

$(document).ready(function() {
  //setIframeBackground();

  // -------------------- Begin Splitter -----------------------------

  // Main vertical splitter, anchored to the browser window
  $("#MySplitter").splitter({
    type: "v",
    outline: true,
    minLeft: 60,
    sizeLeft: 100,
    maxLeft: 250,
    anchorToWindow: true,
    resizeOnWindow: true,
    accessKey: "L"
  });
  // Second vertical splitter, nested in the right pane of the main one.
  $("#CenterAndRight").splitter({
    type: "v",
    outline: true,
    minRight: 200,
    sizeRight: $(window).width() * 0.6,
    maxRight: $(window).width() * 0.9,
    accessKey: "R"
  });
  $(window).resize(function() {
    $("#MySplitter").trigger("resize");
  });

  // -------------------- End Splitter -----------------------------

  // --------------- Begin UML snippet bar ------------------

  $("#umlsnippets")
    .find(".button")
    .click(function() {
      var diagramType = $(this)
        .parent()
        .attr("class");

      if (lastUmlDiagram !== diagramType) {
        if (
          !confirm(
            "The current diagram will be cleared? Do you want to continue?"
          )
        )
          return;

        myCodeMirror.setValue("");
      }

      changeDiagramType(diagramType);

      var umlsnippet = $(this)
        .find("pre.umlsnippet")
        .text();

      var pos = myCodeMirror.getCursor(true);

      // When replaceRange or replaceSelection is called
      // to insert text, in IE 8, the code editor gets
      // screwed up. So, it needs to be recreated after this.
      myCodeMirror.replaceRange(umlsnippet, myCodeMirror.getCursor(true));

      // recreate the code editor to fix screw up in IE 7/8
      myCodeMirror.toTextArea();
      myCodeMirror = CodeMirror.fromTextArea($("#umltext").get(0), {
        onChange: refreshDiagram
      });

      myCodeMirror.focus();
      myCodeMirror.setCursor(pos);

      refreshDiagram();
    });

  // -------------------- End UML Snippet Bar -----------------------------

  // -------------------- Begin UML Code editor -----------------------------

  defaultUmlText = $("#umltext").val();

  myCodeMirror = CodeMirror.fromTextArea($("#umltext").get(0), {
    onChange: refreshDiagram
  });
  myCodeMirror.focus();
  myCodeMirror.setCursor({ line: myCodeMirror.lineCount() + 1, ch: 1 });

  // -------------------- End UML Code editor -----------------------------

  // -------------------- Load/Restore UML diagram -----------------------------

  // If URL has a diagram location, then load that diagram
  if (diagramId.length > 0) {
    $.get("/diagram/" + encodeURI(diagramId), function(result) {
      myCodeMirror.setValue(result.umlText);
      saveUmlText(result.umlText);
      saveUmlType(result.umlType);
    });
  } else {
    // restore previously saved UML
    var existingUml = loadUmlText();
    if (existingUml != null && $.trim(existingUml).length > 0) {
      try {
        myCodeMirror.setValue(existingUml);
      } catch (e) { 
        console.log(e)
      }
    }
  }

  $("#umlimage").bind("load", function() {
    lastTimer = null;
    hideProgress();
    refreshDiagram();
    $(this).fadeTo(0, 0.5, function() {
      $(this).fadeTo(300, 1.0);
    });
  });
});

var lastUmlText = "";
var lastTimer = null;

function saveUmlText(umltext) {
  window.localStorage.setItem("umltext", umltext);
}
function loadUmlText() {
  return window.localStorage.getItem("umltext") || "";
}
function saveUmlType(type) {
  window.localStorage.setItem("umltype", type);
}
function loadUmlType() {
  return window.localStorage.getItem("umltype");
}

function refreshDiagram() {
  if (lastTimer == null) {
    lastTimer = window.setTimeout(function() {
      // Remove starting and ending spaces
      var umltext = myCodeMirror
        .getValue()
        .replace(/(^[\s\xA0]+|[\s\xA0]+$)/g, "");

      var umltextchanged = umltext !== lastUmlText && validDiagramText(umltext);

      if (umltextchanged) {
        showProgress();

        lastUmlText = umltext;

        // $.post(
        //   "SendUml.ashx",
        //   { uml: umltext },
        //   function(result) {
        //     var key = $.trim(result);
        //     $("#umlimage").attr("src", "getimage.ashx?key=" + key);
        //   },
        //   "text"
        // );

        var postBody = "@startuml\n" + umltext + "\n@enduml";

        $.ajax({
          type: "POST",
          url: window.PLANTUML_API_URL,
          data: postBody, // <-- Put comma here
          contentType: "text/plain",
          dataType: "text",
          success: function(response, status) {
            hideProgress();
            if (response.indexOf("Syntax error") != -1) {
            } else {
              var parser = new DOMParser();
              var doc = parser.parseFromString(response, "image/svg+xml");

              $("#umlimage_container")
                .empty()
                .append(doc.documentElement);

              saveUmlText(umltext);
            }
          },
          error: function(xhr, status, error) {
            $("#umlimage_container")
              .empty()
              .append(error);
            hideProgress();
          }
        });
      }
    }, 1000);
  } else {
    window.clearTimeout(lastTimer);
    lastTimer = null;
    refreshDiagram();
  }
}

function validDiagramText(umltext) {
  var lines = umltext.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if ((line.split('"').length - 1) % 2 > 0) return false;

    if (
      lastUmlDiagram == "sequence_diagram" &&
      line.indexOf(">") > 0 &&
      line.indexOf(":") < 0
    )
      return false;
  }

  return true;
}

function changeDiagramType(diagramType) {
  lastUmlDiagram = diagramType;
  saveUmlType(diagramType);
}

function showProgress() {
  $("#ProgressIndicator").show();
}

function hideProgress() {
  $("#ProgressIndicator").hide();
}

// ------------------- End Diagram Drawing ----------------------

// ------------------- Begin menu handlers -----------------

function menu_new() {
  changeDiagramType(DEFAULT_DIAGRAM_TYPE);
  myCodeMirror.setValue(defaultUmlText);
  saveUmlType(null);
  if (diagramId.length > 0) {
    document.location = document.location.pathname;
  }
}

function menu_save() {
  showProgress();
  $.post(
    "/diagram/" + diagramId,
    {
      umlText: myCodeMirror.getValue(),
      umlType: lastUmlDiagram
    },
    function(result) {
      hideProgress();
      var diagram = JSON.parse(result);
      if (diagram) {
        saveUmlText(diagram.umlText);
        saveUmlType(diagram.umlType);

        document.location.hash = diagram.id;
        diagramId = diagram.id;
      }
    },
    "text"
  );
}
