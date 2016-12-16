import uuid
from sqlalchemy_utils import UUIDType
from server.app_starter import sql_alchemy_db as db

class ResourceModel(db.Model):
    """docstring for ResourceModel"""

    id = db.Column(UUIDType(binary=False), primary_key=True)
    rtype = db.Column(db.String(64))
    location = db.Column(db.String(512))

    def __init__(self, rtype, location):
        super(ResourceModel, self).__init__()
        self.rtype = rtype
        self.location = location
        self.id = self.id_from_path(rtype, location)

    @staticmethod
    def id_from_path(rtype, location):
        return uuid.uuid5(uuid.NAMESPACE_DNS, '{}::{}'.format(rtype, location)).hex
