require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillmatrix';

const collectionsToBackfill = [
    { label: 'Roles', collectionName: 'roles' },
    { label: 'Departments', collectionName: 'departments' },
    { label: 'Sections', collectionName: 'sections' },
    { label: 'Teams', collectionName: 'teams' },
    { label: 'Company Positions', collectionName: 'projectpositions' },
    { label: 'Skill Categories', collectionName: 'skillcategories' },
    { label: 'Skills', collectionName: 'skills' },
];

const userSchema = new mongoose.Schema(
    {
        email: String,
        role: String,
        isApproved: Boolean,
        isActive: Boolean,
        createdAt: Date,
    },
    {
        strict: false,
        collection: 'users',
    }
);

const User = mongoose.models.AuditBackfillUser || mongoose.model('AuditBackfillUser', userSchema);

const buildBackfillPipeline = (fallbackActorId) => {
    const fallbackValue = fallbackActorId || null;

    return [
        {
            $set: {
                createdBy: { $ifNull: ['$createdBy', fallbackValue] },
                updatedBy: {
                    $ifNull: [
                        '$updatedBy',
                        {
                            $ifNull: ['$createdBy', fallbackValue],
                        },
                    ],
                },
                deletedAt: { $ifNull: ['$deletedAt', null] },
                deletedBy: { $ifNull: ['$deletedBy', null] },
            },
        },
    ];
};

async function backfillAuditFields() {
    await mongoose.connect(mongoUri);

    try {
        const fallbackActor = await User.findOne({
            role: 'admin',
            isApproved: true,
            isActive: { $ne: false },
        })
            .sort({ createdAt: 1, _id: 1 })
            .lean();

        const fallbackActorId = fallbackActor?._id || null;

        console.log('Connected to MongoDB.');
        if (fallbackActor) {
            console.log(`Using ${fallbackActor.email} as the fallback audit actor for historical records.`);
        } else {
            console.log('No approved active admin was found. Historical actor fields will be backfilled as null.');
        }

        for (const { label, collectionName } of collectionsToBackfill) {
            const collection = mongoose.connection.collection(collectionName);
            const result = await collection.updateMany({}, buildBackfillPipeline(fallbackActorId));

            console.log(
                `${label}: matched ${result.matchedCount}, modified ${result.modifiedCount}`
            );
        }

        console.log('Audit backfill completed successfully.');
    } finally {
        await mongoose.disconnect();
    }
}

backfillAuditFields().catch((error) => {
    console.error('Audit backfill failed:', error);
    mongoose.disconnect().finally(() => process.exit(1));
});
