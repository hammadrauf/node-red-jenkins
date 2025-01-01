module.exports = function(RED) {
    const Jenkins = require('jenkins');
    const JSDOM = require('jsdom');

    function NodeJenkinsBuildParams(config) {
        RED.nodes.createNode(this, config);
        this.connection = RED.nodes.getNode(config.connection);
        var node = this;
        const methodBuildParams = "job.config"

        this.on('input', async function(msg) {
            try {
                node.status({fill:'green', shape:'ring', text:'initializing....'});

                if (msg.hasOwnProperty('jobname')) {
                    config.jobname = msg.jobname;
                }

                const urlParts = node.connection.baseUrl.split('://');
                const jenkinsClient = new Jenkins({
                // form the url with the username and password
                baseUrl: urlParts[0] + '://' + node.connection.username + ':' + node.connection.password + '@' + urlParts[1],
                });
        
                node.status({fill:'green', shape:'ring', text:'calling....'});

                // method is config.method and can be 'jobs.get'
                let method = jenkinsClient;
                let caller;
                methodBuildParams.split('.').forEach(m => {
                caller = method;
                method = method[m];
                });
        
                // params can be an array if multiple params are needed
                let params = config.jobname;
                if (!Array.isArray(params)) {
                    // maybe String only  
                    params = [params];
                }          

                // call method with params, bind to caller
                xml = await method.apply(caller, params);
                //const xml = data.xml;
                const dom = new JSDOM(xml, { contentType: "text/xml" });
                const xmlDoc = dom.window.document;
                const parameterDefinitions = xmlDoc.getElementsByTagName("parameterDefinitions")[0];
                const elements = parameterDefinitions.children;
                const results = [];

                for (let element of elements) {
                    const hudsonModel = element.querySelector("hudson\\.model\\..*");
                    const name = element.getElementsByTagName("name")[0];
                    const defaultValue = element.getElementsByTagName("defaultValue")[0];
                    if (hudsonModel && name) {
                        results.push({
                            hudsonModel: hudsonModel.tagName,
                            name: name.textContent,
                            defaultValue: defaultValue ? defaultValue.textContent : "Not Provided"
                        });
                    }
                }

                msg.payload = results;
                node.status({fill:'green', shape:'dot', text:'Done'});
                node.send(msg);
            } catch (error) {
                node.status({fill:'red', shape:'dot', text:'Error'});
                node.error(error);
                node.error(error.stack);
            }
        });
    }
    RED.nodes.registerType("jenkins-build-params", NodeJenkinsBuildParams);
}
