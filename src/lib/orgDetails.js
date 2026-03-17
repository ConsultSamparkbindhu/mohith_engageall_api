/* eslint-disable prettier/prettier */
'use strict';

import { DynamoDB } from 'aws-sdk';

const db = new DynamoDB.DocumentClient({ region: 'ap-south-1' });

/**
 * Inserts organization details into DynamoDB.
 * Prevents GSTIN duplication across organizations, but allows reuse within same orgId.
 */
export async function OrgDetails(req, res) {
  const data = req.body;
  console.log(data, 'data');

  const orgId = data.orgId;
  const gstin = data.gstin;

  if (!orgId || !gstin) {
    return res.status(400).json({ message: 'Missing orgId or gstin in request' });
  }

  // Step 1: Query GSTIN index
  const checkParams = {
    TableName: process.env.ORGANIZATION_TABLE,
    IndexName: 'gstin-index',
    KeyConditionExpression: 'gstin = :g',
    ExpressionAttributeValues: {
      ':g': gstin
    }
  };

  try {
    const gstCheck = await db.query(checkParams).promise();

    // Step 2: Check if any existing entry uses the same GSTIN under a *different orgId*
    const duplicateInAnotherOrg = gstCheck.Items.some(item => item.pk !== orgId);

    if (duplicateInAnotherOrg) {
      console.log(`GSTIN already used in another orgId.`);
      return res.status(409).json({
        message: 'This GSTIN is already registered under another organization.'
      });
    }

    // Step 3: Proceed to insert
    const params = {
      TableName: process.env.ORGANIZATION_TABLE,
      Item: {
        pk: orgId,
        sk: data.sk || 'profile', // fallback to 'profile' if not provided
        ...data
      }
    };

    await db.put(params).promise();
    console.log('Organization details inserted successfully!');
    return res.status(200).json({ message: 'Organization created successfully' });

  } catch (error) {
    console.error('Error inserting org details:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}


// /* eslint-disable prettier/prettier */
// 'use strict';

// import { DynamoDB } from 'aws-sdk';
// import { uploadFileToS3 } from './uploadFileToS3';

// const db = new DynamoDB.DocumentClient({ region: 'ap-south-1' });

// /**
//  * Inserts organization details into DynamoDB.
//  * @param {string} orgId - The unique identifier for the organization.
//  * @param {Object} orgDetails - The profile details of the organization.
//  * @returns{object}
//  */
// export async function OrgDetails(req, res) {
//   const data = req.body;
//   console.log(data, 'data');
//   const pk = data.orgId;

//   const params = {
//     TableName: process.env.ORGANIZATION_TABLE, // Ensure this environment variable is set
//     Item: {
//       pk: pk, // Prefix the pk with the organization name
//       sk: 'profile',
//       ...data,
//     },
//   };

//   try {
//     const result = await db.put(params).promise();
//     console.log('Organization details inserted successfully!');
//     return result;
//   } catch (error) {
//     console.error('Error while inserting Organization details:', error);
//     return { message: 'Error', error: error.message };
//   }
// }

export async function GetOrgDetails(req, res) {
  const { orgId } = req.query;
  const data = req.body;
  console.log(data, 'data');
  const pk = orgId;

  const params = {
    TableName: process.env.ORGANIZATION_TABLE, // Ensure this environment variable is set
    Key: {
      pk: pk, // Partition key
      sk: 'profile', // Sort key
    },
  };

  try {
    const result = await db.get(params).promise();
    console.log('Organization details fetched successfully!');
    return result;
  } catch (error) {
    console.error('Error while fetching Organization details:', error);
    return { message: 'Error', error: error.message };
  }
}

async function uploadToS3(files, phone_no) {
  console.log('Uploading to s3');
  var fileLocations = {};
  for (var i = 0; i < files.length; i++) {
    let file = files[i];
    fileLocations[file.fieldname] = await uploadFileToS3(file, phone_no);
    //await writeToLogGroup(`File uploaded to S3 for ${phone_no} ,from uploadToS3, register.js`, logGroupName, logStreamName, 'INFO')
  }
  const res = await uploadUrlToDb(fileLocations, phone_no);
  return res;
}
export default {
  uploadToS3,
};