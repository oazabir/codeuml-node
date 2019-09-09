var $ = $ || jQuery;
var DEFAULT_DIAGRAM_TYPE = "sequence_diagram";
var myCodeMirror;
var defaultUmlText;
var lastUmlDiagram = loadUmlType();


function getDiagramId() {
  if (document.location.hash.length > 0)
    return document.location.hash.substr(1);
  else
    return "";
}
function setDiagramId(id) {
  document.location.hash = id;
}

$(document).ready(function () {
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
  // // Spllier on the UML rendered image
  // $("#TopAndBottom").splitter({
  //   type: "h",
  //   outline: true,
  //   minTop: 100,
  //   sizeTop: 100,
  //   maxTop: $(window).height() * 0.5,
  //   accessKey: "T"
  // });

  
  $(window).resize(function () {
    $("#MySplitter").trigger("resize");
  });

  // -------------------- End Splitter -----------------------------

  // --------------- Begin UML snippet bar ------------------

  $("#umlsnippets")
    .find(".button")
    .click(function () {
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
  if (getDiagramId().length > 0) {
    $.get("/diagram/" + encodeURI(getDiagramId()), function (diagram) {
      if (diagram) {
        myCodeMirror.setValue(diagram.umlText);
        saveUmlText(diagram.umlText);
        saveUmlType(diagram.umlType);
      }
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

  $("#umlimage").bind("load", function () {
    lastTimer = null;
    hideProgress();
    refreshDiagram();
    $(this).fadeTo(0, 0.5, function () {
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
  return window.localStorage.getItem("umltype") || DEFAULT_DIAGRAM_TYPE;
}

function refreshDiagram() {
  if (lastTimer == null) {
    lastTimer = window.setTimeout(function () {
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

        $.ajax({
          type: "POST",
          url: '/uml',
          data: JSON.stringify({
            umlText: umltext,
            umlType: lastUmlDiagram
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          success: function (response, status) {
            hideProgress();
            // var parser = new DOMParser();
            // var doc = parser.parseFromString(response, "image/svg+xml");
            // $("#umlimage_container")
            //   .empty()
            //   .append(doc.documentElement);

            var img = document.createElement("img");
            img.src = response.svg;
            img.onload = function () {
              
              var bodyCanvas = document.getElementById("bodyCanvas"),
                  bodyContext = bodyCanvas.getContext("2d");

              bodyCanvas.width = img.width;
              bodyCanvas.height = img.height;
              bodyContext.drawImage(img, 0, 0);

              var headerCanvas = document.getElementById("headerCanvas"),
                  headerContext = headerCanvas.getContext("2d");

              headerCanvas.width = img.width;
              headerCanvas.height = img.height;
              headerContext.drawImage(img, 0, 0);


              // var canvasdata = canvas.toDataURL("image/png");

              // var pngimg = '<img style="position:absolute; top:0; left:0" src="' + canvasdata + '">';
              // $("#umlimage_container")
              //   .empty()
              //   .append(pngimg);

              $('#umlimage').remove();            
              bodyContainer.onscroll = function() {
                headerContainer.scrollLeft = bodyContainer.scrollLeft;
              }
            };            

            saveUmlText(umltext);

          },
          error: function (xhr, status, error) {
            $("#bodyContainer")
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

function cloneCanvas(oldCanvas) {

  //create a new canvas
  var newCanvas = document.createElement('canvas');
  var context = newCanvas.getContext('2d');

  //set dimensions
  newCanvas.width = oldCanvas.width;
  newCanvas.height = oldCanvas.height;

  //apply the old canvas to the new one
  context.drawImage(oldCanvas, 0, 0);

  //return the new canvas
  return newCanvas;
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
  saveUmlType(DEFAULT_DIAGRAM_TYPE);
  saveUmlText(defaultUmlText);
  setDiagramId('');
}

function menu_save() {
  showProgress();

  $.ajax({
    type: "POST",
    url: "/diagram/" + getDiagramId(),
    data: JSON.stringify({
      umlText: myCodeMirror.getValue(),
      umlType: lastUmlDiagram
    }),
    contentType: "application/json; charset=utf-8",
    success: function (diagram) {
      hideProgress();
      if (diagram) {
        saveUmlText(diagram.umlText);
        saveUmlType(diagram.umlType);

        setDiagramId(diagram.id);
      }
    },
    dataType: "json"
  });

}
