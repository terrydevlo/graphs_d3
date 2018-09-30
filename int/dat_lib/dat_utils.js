export default class DatUtils {
  constructor() {
  }

  count_levels(dat, nOutLevels, maxLevels) {
    if (!nOutLevels) {
      nOutLevels = 0;
      maxLevels = 0;
    }
    if (_.isArray(dat)) {
      nOutLevels++;

      _.each((dat), entry => {
        if (_.isPlainObject(entry) || _.isArray(entry)) {
          nOutLevels = this.count_levels(entry, nOutLevels);
        }
      });

    } else if (_.isPlainObject(dat)){
      _.forOwn(dat, (v, k) => {
        nOutLevels = this.count_levels(v, nOutLevels);
      });
    }

    return nOutLevels;
  }

  extract_xml(dat, elsToExtract) {
    let outXML = dat.getElementsByTagName(elsToExtract);
    console.log("outXML: ", outXML);
  }

  // Changes XML to JSON
  xml_to_json(xml) {
    // https://davidwalsh.name/convert-xml-json

  	// Create the return object
  	let obj = {};

  	if (xml.nodeType == 1) { // element
  		// do attributes
  		if (xml.attributes.length > 0) {
  		obj["@attributes"] = {};
  			for (let j = 0; j < xml.attributes.length; j++) {
  				let attribute = xml.attributes.item(j);
  				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
  			}
  		}
  	} else if (xml.nodeType == 3) { // text
  		obj = xml.nodeValue;
  	}

  	// do children
  	if (xml.hasChildNodes()) {
  		for(let i = 0; i < xml.childNodes.length; i++) {
  			let item = xml.childNodes.item(i);
  			let nodeName = item.nodeName;
  			if (typeof(obj[nodeName]) == "undefined") {
  				obj[nodeName] = this.xml_to_json(item);
  			} else {
  				if (typeof(obj[nodeName].push) == "undefined") {
  					let old = obj[nodeName];
  					obj[nodeName] = [];
  					obj[nodeName].push(old);
  				}
  				obj[nodeName].push(this.xml_to_json(item));
  			}
  		}
  	}
  	return obj;
  };
}