'use strict'
var AWS = require('aws-sdk')
var s3 = new AWS.S3()
 
exports.handler = async (event) => {
    console.log("request: " + JSON.stringify(event))
    
    let key = ''
    let value = ''
    
    const bucketName = process.env.bucketName
    const folderName = process.env.folderName
    
    let responseBody = {}
    responseBody.messages = []
    responseBody.errors = [] 
    
    if (!event.body) 
    {
        // LPI response must be object in this form
        const response = 
        {
            statusCode: 400,
            headers: 
            {
                "x-custom-header" : "header",
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With'
            },
            body: "{No event body}"
        }
        return response
    }
    
    const body = JSON.parse(event.body)
    const ip = event['requestContext']['identity']['sourceIp']
    
    const localhost = "your.local.ip.address"
    
    var allowList = [localhost]
    
    if (!allowList.includes(ip)) // Allowlist IPs, also can configure in API Gateway
    {
        const response = 
        {
            statusCode: 400,
            headers: 
            {
                "x-custom-header" : "header",
                "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            },
            body: '{No authorization token1}'
        }
        return response
    }
    
    let count = 0
    
    for (let p in body) // process each key value pair
    {   
        key = p
        value = body[p]

        if (key === "$rm")  // Delete
        {
            ++count
            key = folderName + "/" + value
            
            const params = 
            {
                Bucket: bucketName, 
                Key: key
            }
               
            try 
            {
                const msg = 'Deleted ' + value
                responseBody.messages.push(msg)
                const s3resp = (await (s3.deleteObject(params).promise()))
            } 
            catch (err)
            {
                const msg = 'Delete failed ' + key + ' ' + err
                responseBody.errors.push(msg)
            } 
            continue
        }    
        
        if (key === "$ls")  // List keys
        {
            ++count
            var prefix = folderName + "/"
            if (value)
                prefix += value + "/"
            const params = 
            {
                Bucket: bucketName, 
                Delimiter: '/',
                Prefix: prefix,
                MaxKeys: 1000
            }
            
            responseBody['$ls'] = []
               
            try 
            {
                const data = await (s3.listObjectsV2(params).promise())
                const contents = data.Contents
                // let count = 1
                contents.forEach(function (content) 
                {
                    responseBody['$ls'].push(content.Key.replace(new RegExp("^" + folderName + '/'), '')) // remove folderName
                    // ++count
                })
            } 
            catch (err)
            {
                const msg = 'ls failed ' + key + ' error: ' + err
                responseBody.errors.push(msg)
            } 
            continue
        }
        
        if (key != '' && value != '') // Insert
        {
            ++count
            const maxlength = 10000
            if (value.length > maxlength)
            {
                const res = 'Value too large, max = ' + maxlength
                responseBody.errors.push(res)
            }
            
            const prefixKey = folderName + "/" + key
            
            const params = 
            { 
                Bucket: bucketName, 
                Key: prefixKey, 
                Body: value 
            }
            
            try 
            { 
                const s3Response = await s3.putObject(params).promise()
                const res = 'Inserted ' + key
                responseBody.messages.push(res)
            } 
            catch (err) 
            {
                console.log(err)
                let msg = 'Insert failed ' + key
                responseBody.errors.push(msg)
            }        
            continue
        }
        
        if (key != '' && value === '') // Get
        {
            ++count
            const prefixKey = folderName + "/" + key
            const params = 
            { 
                Bucket: bucketName, 
                Key: prefixKey
            }
            
            try 
            {
                const data = (await (s3.getObject(params).promise())).Body.toString('utf-8')
                responseBody[key] = data
            } 
            catch (err)
            {
                const msg = 'Retrieve failed ' + key + ' error: ' + err
                responseBody.errors.push(msg)
            }        
            continue
        }
        
        if (key === '' && value === '') // nothing to process
        {
            const res = 'Key or value required'
            responseBody.errors.push(res)
            continue
        }
    } // multiple keys loop
    
    if (responseBody.messages.length === 0)
        delete responseBody.messages
        
    if (responseBody.errors.length === 0)
        delete responseBody.errors

    const response = 
    {
        statusCode: 200,
        headers: 
        {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "x-custom-header" : "header"
        },
        body: JSON.stringify(responseBody)
    }
    console.log("response: " + JSON.stringify(response))
    return response
}