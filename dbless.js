'use strict';
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
 
exports.handler = async (event) => {
    // console.log("request: " + JSON.stringify(event));
    
    let key = '';
    let value = '';
    
    const bucketName = process.env.bucketName; 
    const collectionName = process.env.collectionName;
    
    let responseBody = {};
    responseBody.messages = [];
    responseBody.errors = [];    
    
    if (!event.body) 
    {
        responseBody = '{No event body}';   
        // LPI response must be object in this form
        const response = 
        {
            statusCode: 400,
            headers: 
            {
                "x-custom-header" : "header"
            },
            body: JSON.stringify(responseBody)
        };
        return response;  
    }
    
    const body = JSON.parse(event.body);
    const ip = event['requestContext']['identity']['sourceIp'];
    
    if (ip != "Your IP here") // Allowlist IPs, OR make endpoint private OR configure other auth
    {
        responseBody = '{No authorization token}';
        const response = 
        {
            statusCode: 400,
            headers: 
            {
                "x-custom-header" : "header"
            },
            body: JSON.stringify(responseBody)
        };
        return response;      
    }
    
    let count = 0;
    
    for (let p in body) // process each key value pair
    {   
        key = p;
        value = body[p];

        if (key === "$rm")  // Delete
        {
            ++count;
            key = collectionName + "/" + value;
            
            const params = 
            {
                Bucket: bucketName, 
                Key: key
            };
               
            try 
            {
                const msg = 'Deleted ' + value;
                responseBody.messages.push(msg);
                const s3resp = (await (s3.deleteObject(params).promise()));
            } 
            catch (err)
            {
                const msg = 'Delete failed ' + key + ' ' + err;
                responseBody.errors.push(msg);
            } 
            continue;
        }    
        
        if (key === "$ls")  // List keys
        {
            ++count;
            const prefix = collectionName + "/";
            const params = 
            {
                Bucket: bucketName, 
                Delimiter: '/',
                Prefix: prefix,
                MaxKeys: 1000
            };
            
            responseBody['$ls'] = [];
               
            try 
            {
                const data = await (s3.listObjectsV2(params).promise());
                const contents = data.Contents;
                // let count = 1;
                contents.forEach(function (content) 
                {
                    responseBody['$ls'].push(content.Key.replace(new RegExp("^" + collectionName + '/'), '')); // remove collectionName
                    // ++count;
                });
            } 
            catch (err)
            {
                const msg = 'ls failed ' + key + ' error: ' + err;
                responseBody.errors.push(msg);
            } 
            continue;
        }
        
        if (key != '' && value != '') // Insert
        {
            ++count;
            const maxlength = 10000;	// Increase this if using large values
            if (value.length > maxlength)
            {
                const res = 'Value too large, max = ' + maxlength;
                responseBody.errors.push(res);
            }
            
            const prefixKey = collectionName + "/" + key;
            
            const params = 
            { 
                Bucket: bucketName, 
                Key: prefixKey, 
                Body: value 
            };
            
            try 
            { 
                const s3Response = await s3.putObject(params).promise();
                const res = 'Inserted ' + key;
                responseBody.messages.push(res);
            } 
            catch (err) 
            {
                console.log(err);
                let msg = 'Insert failed ' + key;
                responseBody.errors.push(msg);
            }        
            continue;
        }
        
        if (key != '' && value === '') // Get
        {
            ++count;
            const prefixKey = collectionName + "/" + key;
            const params = 
            { 
                Bucket: bucketName, 
                Key: prefixKey
            };
            
            try 
            {
                const data = (await (s3.getObject(params).promise())).Body.toString('utf-8');
                responseBody[key] = data;
            } 
            catch (err)
            {
                const msg = 'Retrieve failed ' + key + ' error: ' + err;
                responseBody.errors.push(msg);
            }        
            continue;
        }
        
        if (key === '' && value === '') // nothing to process
        {
            const res = 'Key or value required';
            responseBody.errors.push(res);
            continue;
        }
    } // multiple keys loop
    
    if (responseBody.messages.length === 0)
        delete responseBody.messages;
        
    if (responseBody.errors.length === 0)
        delete responseBody.errors;

    const response = 
    {
        statusCode: 200,
        headers: 
        {
            "x-custom-header" : "header"
        },
        body: JSON.stringify(responseBody)
    };
    // console.log("response: " + JSON.stringify(response));
    return response;
};

// MIT License

// Copyright (c) 2019 James Creasy

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.