/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Mon May 23 2016 14:23:16 GMT-0500 (CDT).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'q',
    'text!./metadata.json',
    'plugin/PluginBase'
], function (
    Q,
    pluginMetadata,
    PluginBase
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of CreateExecution.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin CreateExecution.
     * @constructor
     */
    var CreateExecution = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    CreateExecution.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    CreateExecution.prototype = Object.create(PluginBase.prototype);
    CreateExecution.prototype.constructor = CreateExecution;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    CreateExecution.prototype.main = function (callback) {
        // Verify that the node is a pipeline
        if (!this.core.isTypeOf(this.activeNode, this.META.Pipeline)) {
            return callback('Current node is not a Pipeline!', this.result);
        }

        return this.createExecution(this.activeNode)
            .then(() => {
                this.result.setSuccess(true);
                callback(null, this.result);
            })
            .catch(err => callback(err, this.result));
    };

    CreateExecution.prototype.createExecution = function (node) {
        var name = this.core.getAttribute(node, 'name');

        // Given a pipeline, copy all the operations to a custom job
        //   - Copy the operations 
        //   - Wrap the operations in "Job" boxes which contain running info
        //     - eg,
        //       - 'debug' the given run (download all execution files)
        //       - 'console' show console output (future feature)
        //   - Update the references
        var tgtNode,
            copies,
            opTuples,  // [[op, index], [op, index], ...]
            dataMapping = {};

        tgtNode = this.core.createNode({
            base: this.META.Execution,
            parent: this.rootNode
        });
        this.core.setAttribute(tgtNode, 'name', `${name} Execution`);

        return this.core.loadChildren(node)
            .then(children => {
                copies = this.core.copyNodes(children, tgtNode);
                opTuples = copies
                    .map((copy, i) => [copy, i])  // zip w/ index
                    .filter(pair => this.core.isTypeOf(pair[0], this.META.Operation));

                // Create a mapping of old names to new names
                return Q.all(opTuples.map(pair =>
                        // Add the input/output mappings to the dataMapping
                        this.addDataToMap(children[pair[1]], pair[0], dataMapping)
                    )
                );
            })
            .then(() => {  // datamapping is set!
                this.updateReferences(copies, dataMapping);
                this.boxOperations(opTuples.map(o => o[0]), tgtNode);
                return this.save(`Created execution of ${name}`);
            })
            .then(() => tgtNode);  // return tgtNode
    };

    CreateExecution.prototype.getExecutionsDir = function () {
        return this.rootNode;
    };

    CreateExecution.prototype.addDataToMap = function (srcOp, dstOp, map) {
        return Q.all(
            [srcOp, dstOp]
                .map(op => {
                    // Get the inputs and outputs for both
                    return this.core.loadChildren(op)
                        .then(containers => {
                            var names = containers.map(c => this.core.getAttribute(c, 'name')),
                                inputs = containers
                                    .find((c, i) => names[i] === 'Inputs'),
                                outputs = containers
                                    .find((c, i) => names[i] === 'Outputs');

                            return Q.all(
                                [inputs, outputs].map(c => c ? this.core.loadChildren(c) : [])
                            );
                        });
                })
            )
            .then(ios => {
                var srcIO,
                    dstIO;

                srcIO = ios[0].map(c => this.sortIOByName(c));
                dstIO = ios[1].map(c => this.sortIOByName(c));

                // match the nodes by same name!
                srcIO.forEach((srcContainer, c) => srcContainer.forEach((node, n) => 
                    map[this.core.getPath(node)] = dstIO[c][n]  // old id -> new node
                    )
                );
                return true;
            });
    };

    CreateExecution.prototype.sortIOByName = function (container) {
        return container.sort((a, b) =>
            // sort by name
            this.core.getAttribute(a, 'name') < this.core.getAttribute(b, 'name') ? 1 : -1
        );
    };

    // Wrap each Operation with a Job 'box'
    CreateExecution.prototype.boxOperations = function (operations, container) {
        operations.forEach(copy => {
            var name = this.core.getAttribute(copy, 'name'),
                job;

            // Create job
            job = this.core.createNode({
                base: this.META.Job,
                parent: container
            });
            this.core.setAttribute(job, 'name', name);

            // Move the given copy into the Job node
            this.core.moveNode(copy, job);
        });
    };

    CreateExecution.prototype.updateReferences = function (nodes, map) {
        // For each new node, update the references (other than base)
        // to the correct nodeId
        nodes.forEach(copy => {
            this.core.getPointerNames(copy)
                .filter(name => name !== 'base')
                .forEach(name => {
                    var tgt = this.core.getPointerPath(copy, name);
                    if (map[tgt]) {
                        this.logger.info(`Updating ptr ${name}`);
                        this.core.setPointer(copy, name, map[tgt]);
                    }
                });
        });
    };

    return CreateExecution;
});
